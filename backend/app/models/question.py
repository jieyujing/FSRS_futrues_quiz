from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Question(Base):
    """题目表"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(50), nullable=False, index=True, comment="科目：基础知识/法律法规")
    source = Column(String(200), nullable=False, comment="来源文件名")
    question_type = Column(String(20), nullable=False, comment="题型：单选题/多选题/判断题/综合题")
    question_number = Column(Integer, comment="原题号")
    content = Column(Text, nullable=False, comment="题目内容")
    content_hash = Column(String(32), unique=True, index=True, comment="题目内容哈希，用于去重")
    options = Column(JSON, comment="选项：{'A': '...', 'B': '...', ...}")
    correct_answer = Column(String(20), nullable=False, comment="正确答案")
    explanation = Column(Text, comment="解析内容")
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Question(id={self.id}, type={self.question_type}, subject={self.subject})>"