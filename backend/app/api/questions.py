from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Question
from ..schemas.question import (
    QuestionCreate,
    QuestionResponse,
    QuestionListItem,
    QuestionStats
)
from collections import Counter

router = APIRouter(prefix="/questions", tags=["题目管理"])


@router.get("/", response_model=List[QuestionListItem])
def list_questions(
    skip: int = 0,
    limit: int = 100,
    subject: str = None,
    question_type: str = None,
    db: Session = Depends(get_db)
):
    """获取题目列表（不含答案）"""
    query = db.query(Question)

    if subject:
        query = query.filter(Question.subject == subject)
    if question_type:
        query = query.filter(Question.question_type == question_type)

    return query.offset(skip).limit(limit).all()


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    """获取单个题目详情"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.post("/", response_model=QuestionResponse)
def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """创建题目"""
    db_question = Question(**question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@router.delete("/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    """删除题目"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    db.delete(question)
    db.commit()
    return {"message": "删除成功"}


@router.get("/stats/overview", response_model=QuestionStats)
def get_stats(db: Session = Depends(get_db)):
    """获取题库统计"""
    questions = db.query(Question).all()

    by_subject = Counter(q.subject for q in questions)
    by_type = Counter(q.question_type for q in questions)

    return QuestionStats(
        total=len(questions),
        by_subject=dict(by_subject),
        by_type=dict(by_type)
    )