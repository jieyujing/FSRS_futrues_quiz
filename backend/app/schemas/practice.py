from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import IntEnum


class Rating(IntEnum):
    """FSRS评分"""
    AGAIN = 1  # 再来一次
    HARD = 2   # 困难
    GOOD = 3   # 适中
    EASY = 4   # 简单


class AnswerSubmit(BaseModel):
    """提交答案"""
    question_id: int
    user_answer: str
    time_spent: Optional[int] = None  # 答题时长（秒）


class PracticeResult(BaseModel):
    """答题结果"""
    question_id: int
    is_correct: bool
    correct_answer: str
    explanation: Optional[str] = None
    # FSRS信息
    current_stability: float
    current_difficulty: float


class RatingSubmit(BaseModel):
    """提交FSRS评分"""
    question_id: int
    rating: int  # 1-4


class PracticeQuestion(BaseModel):
    """练习题目（不含答案）"""
    id: int
    question_type: str
    content: str
    options: Optional[Dict[str, str]] = None
    # FSRS状态
    retrievability: Optional[float] = None
    next_review: Optional[datetime] = None

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    """首页统计"""
    total_questions: int
    learned: int
    due_today: int
    accuracy_rate: float
    subjects: List[Dict[str, Any]]