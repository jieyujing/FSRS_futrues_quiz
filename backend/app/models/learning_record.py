from sqlalchemy import Column, Integer, Float, DateTime, Boolean, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class LearningRecord(Base):
    """学习记录表 - FSRS核心数据"""
    __tablename__ = "learning_records"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), unique=True, nullable=False)

    # FSRS参数
    difficulty = Column(Float, default=0.3, comment="难度 0-1")
    stability = Column(Float, default=1.0, comment="稳定性（天）")
    retrievability = Column(Float, comment="可提取性概率")

    # 时间记录
    last_review = Column(DateTime, comment="上次复习时间")
    next_review = Column(DateTime, index=True, comment="下次复习时间")

    # 统计
    review_count = Column(Integer, default=0, comment="复习次数")
    mistake_count = Column(Integer, default=0, comment="错误次数")
    last_rating = Column(Integer, comment="最近评分 1-4")

    # 关系
    question = relationship("Question", backref="learning_record")


class AnswerHistory(Base):
    """答题历史表"""
    __tablename__ = "answer_history"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    user_answer = Column(String(50), comment="用户答案")
    is_correct = Column(Boolean, index=True, comment="是否正确")
    rating = Column(Integer, comment="FSRS评分 1-4")
    time_spent = Column(Integer, comment="答题时长（秒）")
    created_at = Column(DateTime, server_default=func.now())

    # 关系
    question = relationship("Question", backref="answer_history")