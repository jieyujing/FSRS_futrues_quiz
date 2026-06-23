from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
from datetime import datetime

from ..database import get_db
from ..models.flashcard import Flashcard
from ..models.question import Question
from ..models.learning_record import LearningRecord, AnswerHistory
from ..schemas.flashcard import FlashcardResponse, FlashcardListItem, FlashcardBatchResult
from ..services.llm_card_service import LLMCardService
from ..services.fsrs_service import FSRSService

router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])
llm_service = LLMCardService()
fsrs_service = FSRSService()


@router.get("/next", response_model=List[FlashcardResponse])
async def get_next_flashcards(
    limit: int = 20,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取下一组需要复习的卡片"""
    return fsrs_service.get_next_flashcards(db, limit, subject)


@router.post("/rate")
async def rate_flashcard(
    card_id: int,
    rating: int,  # 1-4: Again, Hard, Good, Easy
    db: Session = Depends(get_db)
):
    """为卡片评分并更新 FSRS 参数"""
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # 更新 FSRS 参数，统一委托给深度调度引擎
    from fsrs import Rating
    record = fsrs_service.update_after_review(
        db,
        card_id,
        Rating(rating),
        is_correct=(rating > 1),
        item_type="flashcard"
    )

    # 记录答题历史
    history = AnswerHistory(
        flashcard_id=card_id,
        is_correct=rating > 1,
        rating=rating,
        created_at=datetime.now()
    )
    db.add(history)

    db.commit()
    return {"message": "评分成功", "next_review": record.next_review}


@router.post("/generate/batch", response_model=Dict)
async def generate_flashcards(
    background_tasks: BackgroundTasks,
    subject: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    批量从题目库生成记忆卡片 (后台任务)
    """
    query = db.query(Question.id)
    if subject:
        query = query.filter(Question.subject == subject)

    # 过滤掉已经生成过卡片的题目 (简单去重)
    existing_q_ids = db.query(Flashcard.question_id).distinct().all()
    existing_q_ids = [r[0] for r in existing_q_ids]
    query = query.filter(~Question.id.in_(existing_q_ids))

    question_ids = [r[0] for r in query.limit(limit).all()]

    if not question_ids:
        return {"message": "没有找到需要转换的题目", "processed_count": 0}

    # 添加到后台任务
    background_tasks.add_task(llm_service.process_batch, db, question_ids)

    return {
        "message": f"正在后台处理 {len(question_ids)} 道题目...",
        "target_count": len(question_ids)
    }


@router.get("/", response_model=List[FlashcardListItem])
async def list_flashcards(
    card_type: Optional[str] = None,
    tag: Optional[str] = None,
    difficulty: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取记忆卡片列表"""
    query = db.query(Flashcard)
    if card_type:
        query = query.filter(Flashcard.card_type == card_type)
    if difficulty:
        query = query.filter(Flashcard.difficulty == difficulty)
    if tag:
        # JSON 数组包含搜索
        query = query.filter(Flashcard.tags.contains([tag]))

    return query.offset(skip).limit(limit).all()


@router.get("/analytics/tags", response_model=Dict)
async def get_tag_analytics(db: Session = Depends(get_db)):
    """获取基于标签的统计信息 (用于识别弱点)"""
    # 这是一个简化的实现，由于 tags 是 JSON 格式，SQL 查询可能较复杂
    # 这里我们拉取所有记录在内存中处理，或者使用数据库特定的 JSON 函数
    # 为了演示，我们计算每个标签的总数和平均难度（如果适用）

    all_cards = db.query(Flashcard.tags).all()
    tag_counts = {}
    for (tags,) in all_cards:
        if tags:
            for t in tags:
                tag_counts[t] = tag_counts.get(t, 0) + 1

    # 获取错误率 (基于 AnswerHistory)
    # 关联 Flashcard 和 AnswerHistory
    error_stats = db.query(
        Flashcard.tags,
        func.count(AnswerHistory.id).label("total"),
        func.sum(func.cast(~AnswerHistory.is_correct, func.Integer)).label("errors")
    ).join(AnswerHistory, Flashcard.id == AnswerHistory.flashcard_id).group_by(Flashcard.id).all()

    tag_errors = {}
    for tags, total, errors in error_stats:
        if tags:
            for t in tags:
                if t not in tag_errors:
                    tag_errors[t] = {"total": 0, "errors": 0}
                tag_errors[t]["total"] += total
                tag_errors[t]["errors"] += errors

    return {
        "tag_counts": tag_counts,
        "tag_performance": tag_errors
    }


@router.get("/{card_id}", response_model=FlashcardResponse)
async def get_flashcard(card_id: int, db: Session = Depends(get_db)):
    """获取特定卡片详情"""
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    return card
