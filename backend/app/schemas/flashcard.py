from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FlashcardBase(BaseModel):
    """卡片基础模型"""
    question_id: int
    card_type: str
    front_content: str
    back_content: str
    tags: Optional[List[str]] = None
    difficulty: Optional[str] = None


class FlashcardCreate(FlashcardBase):
    """创建卡片"""
    pass


class FlashcardResponse(FlashcardBase):
    """卡片响应"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FlashcardListItem(BaseModel):
    """卡片列表项 (精简版)"""
    id: int
    question_id: int
    card_type: str
    front_content: str
    tags: Optional[List[str]] = None
    difficulty: Optional[str] = None

    class Config:
        from_attributes = True


class FlashcardBatchResult(BaseModel):
    """批量转换结果"""
    cards: List[FlashcardBase]
