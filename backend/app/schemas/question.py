from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime


class QuestionBase(BaseModel):
    """题目基础模型"""
    subject: str
    source: str
    question_type: str
    question_number: Optional[int] = None
    content: str
    options: Optional[Dict[str, str]] = None
    correct_answer: str
    explanation: Optional[str] = None


class QuestionCreate(QuestionBase):
    """创建题目"""
    pass


class QuestionResponse(QuestionBase):
    """题目响应"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionListItem(BaseModel):
    """题目列表项（不含答案）"""
    id: int
    subject: str
    question_type: str
    content: str
    options: Optional[Dict[str, str]] = None

    class Config:
        from_attributes = True


class QuestionStats(BaseModel):
    """题库统计"""
    total: int
    by_subject: Dict[str, int]
    by_type: Dict[str, int]