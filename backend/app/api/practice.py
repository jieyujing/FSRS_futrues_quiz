from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from ..database import get_db
from ..models import Question, LearningRecord, AnswerHistory
from ..schemas.practice import (
    AnswerSubmit,
    PracticeResult,
    RatingSubmit,
    PracticeQuestion,
    DashboardStats
)
from ..services.fsrs_service import FSRSService
from datetime import datetime
from fsrs import Rating

router = APIRouter(prefix="/practice", tags=["刷题练习"])
fsrs_service = FSRSService()


@router.get("/next", response_model=List[PracticeQuestion])
def get_next_questions(
    limit: int = 20,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取下一批练习题目"""
    questions = fsrs_service.get_next_questions(db, limit, subject)

    result = []
    for q in questions:
        record = db.query(LearningRecord).filter(
            LearningRecord.question_id == q.id
        ).first()

        pq = PracticeQuestion(
            id=q.id,
            question_type=q.question_type,
            content=q.content,
            options=q.options,
            retrievability=record.retrievability if record else None,
            next_review=record.next_review if record else None
        )
        result.append(pq)

    return result


@router.post("/answer", response_model=PracticeResult)
def submit_answer(answer: AnswerSubmit, db: Session = Depends(get_db)):
    """提交答案"""
    question = db.query(Question).filter(
        Question.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 判断答案是否正确
    user_answer = answer.user_answer.upper().strip()
    correct_answer = question.correct_answer.upper().strip()

    # 判断题特殊处理
    if question.question_type == "判断":
        answer_map = {"正确": "T", "错误": "F", "对": "T", "错": "F"}
        user_answer = answer_map.get(user_answer, user_answer)

    is_correct = user_answer == correct_answer

    # 获取FSRS参数
    record = db.query(LearningRecord).filter(
        LearningRecord.question_id == question.id
    ).first()

    return PracticeResult(
        question_id=question.id,
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        current_stability=record.stability if record else 1.0,
        current_difficulty=record.difficulty if record else 0.3
    )


@router.post("/rate")
def submit_rating(rating: RatingSubmit, db: Session = Depends(get_db)):
    """提交FSRS评分，更新学习记录"""
    # 获取最近一次答题记录
    answer = db.query(AnswerHistory).filter(
        AnswerHistory.question_id == rating.question_id
    ).order_by(AnswerHistory.created_at.desc()).first()

    if not answer:
        raise HTTPException(status_code=400, detail="请先提交答案")

    # 更新FSRS参数
    record = fsrs_service.update_after_review(
        db,
        rating.question_id,
        Rating(rating.rating),
        answer.is_correct
    )

    # 更新答题历史
    answer.rating = rating.rating
    db.commit()

    return {
        "message": "评分成功",
        "next_review": record.next_review,
        "stability": record.stability,
        "difficulty": record.difficulty
    }


@router.post("/record-answer")
def record_answer(answer: AnswerSubmit, db: Session = Depends(get_db)):
    """记录答题历史（评分前调用）"""
    question = db.query(Question).filter(
        Question.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 判断答案是否正确
    user_answer = answer.user_answer.upper().strip()
    correct_answer = question.correct_answer.upper().strip()

    if question.question_type == "判断":
        answer_map = {"正确": "T", "错误": "F", "对": "T", "错": "F"}
        user_answer = answer_map.get(user_answer, user_answer)

    is_correct = user_answer == correct_answer

    # 记录答题历史
    history = AnswerHistory(
        question_id=question.id,
        user_answer=answer.user_answer,
        is_correct=is_correct,
        time_spent=answer.time_spent
    )
    db.add(history)
    db.commit()

    return {"recorded": True, "is_correct": is_correct}


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    """获取首页统计数据"""
    stats = fsrs_service.get_statistics(db)

    # 按科目统计 (使用 SQL 聚合查询优化 N+1 问题)
    results = db.query(
        Question.subject,
        func.count(Question.id).label("total"),
        func.sum(case((LearningRecord.review_count > 0, 1), else_=0)).label("learned")
    ).outerjoin(
        LearningRecord, Question.id == LearningRecord.question_id
    ).group_by(Question.subject).all()

    subject_stats = [
        {
            "name": row.subject,
            "total": row.total,
            "learned": int(row.learned or 0),
            "progress": round(int(row.learned or 0) / row.total * 100, 1) if row.total > 0 else 0
        }
        for row in results
    ]

    return DashboardStats(
        total_questions=stats["total_questions"],
        learned=stats["learned"],
        due_today=stats["due_today"],
        accuracy_rate=stats["accuracy_rate"],
        subjects=subject_stats
    )