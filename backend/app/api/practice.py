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
    DashboardStats,
    FSRSStatistics,
    MasteryDistribution,
    RatingDistribution,
    PracticeSessionSummaryRequest,
    PracticeSessionSummaryResponse,
    MasteryDelta
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

    # 批量查询所有 LearningRecord，避免 N+1 问题
    question_ids = [q.id for q in questions]
    records = db.query(LearningRecord).filter(
        LearningRecord.question_id.in_(question_ids)
    ).all() if question_ids else []
    record_map = {r.question_id: r for r in records}

    result = []
    for q in questions:
        record = record_map.get(q.id)
        pq = PracticeQuestion(
            id=q.id,
            question_type=q.question_type,
            content=q.content,
            options=q.options,
            retrievability=record.retrievability if record else None,
            next_review=record.next_review if record else None,
            mistake_count=record.mistake_count if record else 0
        )
        result.append(pq)

    return result


@router.get("/mistakes", response_model=List[PracticeQuestion])
def get_mistake_questions(
    limit: int = 20,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取错题列表进行专项练习"""
    questions = fsrs_service.get_mistake_questions(db, limit, subject)

    # 批量查询所有 LearningRecord，避免 N+1 问题
    question_ids = [q.id for q in questions]
    records = db.query(LearningRecord).filter(
        LearningRecord.question_id.in_(question_ids)
    ).all() if question_ids else []
    record_map = {r.question_id: r for r in records}

    result = []
    for q in questions:
        record = record_map.get(q.id)
        pq = PracticeQuestion(
            id=q.id,
            question_type=q.question_type,
            content=q.content,
            options=q.options,
            retrievability=record.retrievability if record else None,
            next_review=record.next_review if record else None,
            mistake_count=record.mistake_count if record else 0
        )
        result.append(pq)

    return result


def check_answer_correct(question: Question, user_answer: str) -> bool:
    """判断答案是否正确的通用逻辑"""
    user_answer = user_answer.upper().strip()
    correct_answer = question.correct_answer.upper().strip()

    if question.question_type == "判断":
        # 统一映射到 A/B 进行比较
        mapping = {
            "正确": "A", "错误": "B",
            "对": "A", "错": "B",
            "T": "A", "F": "B",
            "A": "A", "B": "B"
        }
        user_val = mapping.get(user_answer, user_answer)
        correct_val = mapping.get(correct_answer, correct_answer)
        return user_val == correct_val
    
    # 针对多选，去掉空格和逗号后比较（可选，但目前多选通常存为 "ABC" 这种形式）
    if "多选" in question.question_type or "不定项" in question.question_type:
        u = "".join(sorted(user_answer.replace(",", "").replace(" ", "")))
        c = "".join(sorted(correct_answer.replace(",", "").replace(" ", "")))
        return u == c

    return user_answer == correct_answer


@router.post("/answer", response_model=PracticeResult)
def submit_answer(answer: AnswerSubmit, db: Session = Depends(get_db)):
    """提交答案"""
    question = db.query(Question).filter(
        Question.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    is_correct = check_answer_correct(question, answer.user_answer)

    # 获取 FSRS 参数
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


@router.post("/record-answer")
def record_answer(answer: AnswerSubmit, db: Session = Depends(get_db)):
    """记录答题历史（评分前调用）"""
    question = db.query(Question).filter(
        Question.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    is_correct = check_answer_correct(question, answer.user_answer)

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


@router.post("/rate")
def submit_rating(rating: RatingSubmit, db: Session = Depends(get_db)):
    """提交 FSRS 评分，更新学习记录"""
    # 获取最近一次答题记录
    answer = db.query(AnswerHistory).filter(
        AnswerHistory.question_id == rating.question_id
    ).order_by(AnswerHistory.created_at.desc()).first()

    if not answer:
        raise HTTPException(status_code=400, detail="请先提交答案")

    # 更新 FSRS 参数
    record = fsrs_service.update_after_review(
        db,
        rating.question_id,
        Rating(rating.rating),
        answer.is_correct,
        item_type="question"
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


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    """获取首页统计数据"""
    stats = fsrs_service.get_statistics(db)
    fsrs_stats = fsrs_service.get_fsrs_statistics(db)

    # 按科目统计 (使用 SQL 聚合查询优化 N+1 问题)
    results = db.query(
        Question.subject,
        func.count(Question.id).label("total"),
        func.sum(case(((LearningRecord.review_count > 0) | (LearningRecord.is_ignored == True), 1), else_=0)).label("learned")
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
        subjects=subject_stats,
        fsrs_stats=fsrs_stats
    )
@router.post("/ignore/{question_id}")
def mark_question_ignored(question_id: int, db: Session = Depends(get_db)):
    """将题目标记为已过滤（太简单，不再练习）"""
    fsrs_service.mark_as_ignored(db, question_id)
    return {"message": "已标记为不再练习"}


@router.post("/summary", response_model=PracticeSessionSummaryResponse)
def get_session_summary(req: PracticeSessionSummaryRequest, db: Session = Depends(get_db)):
    """获取本次练习阶段的总结数据"""
    if not req.question_ids:
        return PracticeSessionSummaryResponse(
            accuracy=0,
            correct_count=0,
            total_count=0,
            total_time_spent=0,
            mastery_delta=MasteryDelta(newly_mastered=0, moved_to_learning=0, total_learned=0)
        )

    # 为与数据库保存的 naive datetime 比较，我们需要去掉时区信息
    start_time_naive = req.start_time.replace(tzinfo=None) if req.start_time.tzinfo else req.start_time

    # 1. 统计答题正确率和时长 (基于 AnswerHistory，且在 start_time 之后)
    # 因为用户可能多次答同一题，我们只取本次 session 范围内的
    ans_stats = db.query(
        func.count(AnswerHistory.id).label("total"),
        func.sum(case((AnswerHistory.is_correct == True, 1), else_=0)).label("correct"),
        func.sum(AnswerHistory.time_spent).label("duration")
    ).filter(
        AnswerHistory.question_id.in_(req.question_ids),
        AnswerHistory.created_at >= start_time_naive
    ).first()

    correct_count = int(ans_stats.correct or 0)
    total_answered = int(ans_stats.total or 0)
    total_time = int(ans_stats.duration or 0)
    accuracy = (correct_count / total_answered * 100) if total_answered > 0 else 0

    # 2. 计算 FSRS 变化 (Mastery Delta)
    # 对于这些题目，统计更新后的状态
    records = db.query(LearningRecord).filter(
        LearningRecord.question_id.in_(req.question_ids)
    ).all()

    newly_mastered = 0
    moved_to_learning = 0
    total_learned = 0

    for r in records:
        if r.review_count and r.review_count > 0:
            total_learned += 1
            # 如果是本次练习刚开始掌握的 (稳定性达到 15 天且本次评分不是 Again)
            if r.stability and r.stability >= 15.0 and r.last_rating and r.last_rating > 1 and r.last_review and r.last_review >= start_time_naive:
                newly_mastered += 1
            
            # 统计新转入学习的 (本次是第一次复习)
            if r.review_count == 1 and r.last_review and r.last_review >= start_time_naive:
                moved_to_learning += 1

    return PracticeSessionSummaryResponse(
        accuracy=round(accuracy, 1),
        correct_count=correct_count,
        total_count=len(req.question_ids),
        total_time_spent=total_time,
        mastery_delta=MasteryDelta(
            newly_mastered=newly_mastered,
            moved_to_learning=moved_to_learning,
            total_learned=total_learned
        )
    )
