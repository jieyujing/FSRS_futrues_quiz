from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class ExamRecordCreate(BaseModel):
    """保存模拟考试记录"""
    source: str
    score: float
    total_questions: int
    correct_count: int
    time_spent: int

class ExamRecordResponse(BaseModel):
    """模拟考试记录响应"""
    id: int
    source: str
    score: float
    total_questions: int
    correct_count: int
    time_spent: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExamSubmit(BaseModel):
    """提交模拟考试试卷"""
    source: str
    answers: Dict[int, str]  # {question_id: user_answer}
    time_spent: int  # 用时（秒）

class QuestionCheckResult(BaseModel):
    """单题校对结果"""
    question_id: int
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None

class ExamSubmitResponse(BaseModel):
    """模拟考试提交后的打分与解析结果"""
    score: float
    total_questions: int
    correct_count: int
    results: List[QuestionCheckResult]
