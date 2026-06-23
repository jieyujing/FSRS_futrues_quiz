from sqlalchemy import Column, Integer, Float, DateTime, String
from sqlalchemy.sql import func
from ..database import Base

class ExamRecord(Base):
    """模拟考试记录表"""
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(200), nullable=False, comment="试卷来源文件名")
    score = Column(Float, nullable=False, comment="模考得分（100分制）")
    total_questions = Column(Integer, nullable=False, comment="试卷总题数")
    correct_count = Column(Integer, nullable=False, comment="答对题目数")
    time_spent = Column(Integer, comment="实际答题用时（秒）")
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<ExamRecord(id={self.id}, source='{self.source}', score={self.score})>"
