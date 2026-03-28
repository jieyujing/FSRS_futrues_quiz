from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class CardType(str, enum.Enum):
    CONCEPT = "Concept"
    RULE = "Rule"
    ERROR = "Error"


class DifficultyLevel(str, enum.Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class Flashcard(Base):
    """FSRS 记忆卡片表 - 由 LLM 从原始题目中提取"""
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)

    # 卡片核心内容
    card_type = Column(String(20), nullable=False, comment="卡片类型: Concept/Rule/Error")
    front_content = Column(Text, nullable=False, comment="卡片正面 (问题/概念提示)")
    back_content = Column(Text, nullable=False, comment="卡片背面 (答案/详细解释)")

    # 分类与标签
    tags = Column(JSON, comment="领域标签: ['carry', 'volatility', ...]")
    difficulty = Column(String(20), comment="预设难度: Easy/Medium/Hard")

    # 时间记录
    created_at = Column(DateTime, server_default=func.now())

    # 关系
    question = relationship("Question", backref="flashcards")

    def __repr__(self):
        return f"<Flashcard(id={self.id}, type={self.card_type}, question_id={self.question_id})>"
