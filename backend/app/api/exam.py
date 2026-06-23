from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Question, AnswerHistory, LearningRecord, ExamRecord
from ..schemas.question import QuestionListItem
from ..schemas.exam import ExamRecordResponse, ExamSubmit, ExamSubmitResponse, QuestionCheckResult
from .practice import check_answer_correct
from ..services.fsrs_service import FSRSService
from fsrs import Rating

router = APIRouter(prefix="/exam", tags=["模拟考试"])
fsrs_service = FSRSService()

@router.get("/questions", response_model=List[QuestionListItem])
def get_exam_questions(source: str, db: Session = Depends(get_db)):
    """根据试卷来源获取所有试卷题目（不含正确答案和解析，防作弊）"""
    questions = db.query(Question).filter(Question.source == source).order_by(Question.question_number, Question.id).all()
    if not questions:
        raise HTTPException(status_code=404, detail="未找到该试卷来源下的题目")
    return questions

@router.post("/submit", response_model=ExamSubmitResponse)
def submit_exam(submit_data: ExamSubmit, db: Session = Depends(get_db)):
    """提交模拟考试试卷，打分并记录错题"""
    questions = db.query(Question).filter(Question.source == submit_data.source).all()
    if not questions:
        raise HTTPException(status_code=404, detail="未找到对应的试题来源")

    correct_count = 0
    total_questions = len(questions)
    results = []

    for q in questions:
        user_ans = submit_data.answers.get(str(q.id)) or submit_data.answers.get(q.id) or ""
        is_correct = check_answer_correct(q, user_ans)

        if is_correct:
            correct_count += 1

        # 检查该题目前是否有 FSRS 学习记录
        existing_record = db.query(LearningRecord).filter(LearningRecord.question_id == q.id).first()

        if not is_correct:
            # 答错：强制同步到 AnswerHistory 并将 FSRS 更新为 AGAIN
            history = AnswerHistory(
                question_id=q.id,
                user_answer=user_ans,
                is_correct=False,
                rating=int(Rating.Again),
                time_spent=None
            )
            db.add(history)
            
            # 更新/创建 FSRS 参数
            fsrs_service.update_after_review(db, q.id, Rating.Again, False, item_type="question")
        else:
            # 答对：如果之前已经开始学习，则记录答题历史并更新 FSRS 参数为 GOOD
            if existing_record:
                history = AnswerHistory(
                    question_id=q.id,
                    user_answer=user_ans,
                    is_correct=True,
                    rating=int(Rating.Good),
                    time_spent=None
                )
                db.add(history)
                fsrs_service.update_after_review(db, q.id, Rating.Good, True, item_type="question")

        results.append(
            QuestionCheckResult(
                question_id=q.id,
                user_answer=user_ans,
                correct_answer=q.correct_answer,
                is_correct=is_correct,
                explanation=q.explanation
            )
        )

    score = (correct_count / total_questions * 100) if total_questions > 0 else 0.0

    # 归档模拟考试成绩
    exam_record = ExamRecord(
        source=submit_data.source,
        score=round(score, 1),
        total_questions=total_questions,
        correct_count=correct_count,
        time_spent=submit_data.time_spent
    )
    db.add(exam_record)
    db.commit()

    return ExamSubmitResponse(
        score=round(score, 1),
        total_questions=total_questions,
        correct_count=correct_count,
        results=results
    )

@router.get("/history", response_model=List[ExamRecordResponse])
def get_exam_history(db: Session = Depends(get_db)):
    """获取所有模拟考试的历史记录"""
    return db.query(ExamRecord).order_by(ExamRecord.created_at.desc()).all()

@router.delete("/history/{record_id}")
def delete_exam_history_record(record_id: int, db: Session = Depends(get_db)):
    """删除单条历史模拟考试记录"""
    record = db.query(ExamRecord).filter(ExamRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="未找到该考试记录")
    db.delete(record)
    db.commit()
    return {"message": "删除成功"}
