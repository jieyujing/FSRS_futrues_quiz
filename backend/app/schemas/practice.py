from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import IntEnum


class Rating(IntEnum):
    """FSRS 评分"""
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
    # FSRS 信息
    current_stability: float
    current_difficulty: float


class RatingSubmit(BaseModel):
    """提交 FSRS 评分"""
    question_id: int
    rating: int  # 1-4


class PracticeQuestion(BaseModel):
    """练习题目（不含答案）"""
    id: int
    question_type: str
    content: str
    options: Optional[Dict[str, str]] = None
    # FSRS 状态
    retrievability: Optional[float] = None
    next_review: Optional[datetime] = None
    mistake_count: Optional[int] = 0

    class Config:
        from_attributes = True


class MasteryDistribution(BaseModel):
    """掌握程度分布"""
    mastered: int  # Stability >= 15
    proficient: int  # Stability >= 5
    learning: int  # Stability < 5 and Retrievability >= 0.7
    review_needed: int  # Retrievability < 0.7


class RatingDistribution(BaseModel):
    """评分分布"""
    again: int  # 1
    hard: int  # 2
    good: int  # 3
    easy: int  # 4


class FSRSStatistics(BaseModel):
    """FSRS 详细统计"""
    mastery_distribution: MasteryDistribution
    average_retrievability: float  # 平均保留率 %
    average_stability: float  # 平均稳定性（天）
    average_difficulty: float  # 平均难度
    total_reviews: int  # 总复习次数
    total_mistakes: int  # 总错误次数
    rating_distribution: RatingDistribution
    total_learned: int  # 已学习题目数


class DashboardStats(BaseModel):
    """首页统计"""
    total_questions: int
    learned: int
    due_today: int
    accuracy_rate: float
    subjects: List[Dict[str, Any]]
    fsrs_stats: FSRSStatistics


class MasteryDelta(BaseModel):
    """FSRS 记忆进度变化"""
    newly_mastered: int      # 熟练度达到 Stability >= 15 的题目数
    moved_to_learning: int   # 从新题变为已学习状态的题目数
    total_learned: int       # 本次练习覆盖的已学习题目总数


class PracticeSessionSummaryRequest(BaseModel):
    """计算练习阶段总结的请求"""
    question_ids: List[int]
    start_time: datetime


class PracticeSessionSummaryResponse(BaseModel):
    """练习阶段总结结果"""
    accuracy: float
    correct_count: int
    total_count: int
    total_time_spent: int    # 秒
    mastery_delta: MasteryDelta
