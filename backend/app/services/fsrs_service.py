from fsrs import Scheduler, Card, Rating, State
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Question, LearningRecord, AnswerHistory


class FSRSService:
    """FSRS算法服务"""

    def __init__(self):
        self.scheduler = Scheduler()

    def get_next_questions(
        self,
        db: Session,
        limit: int = 20,
        subject: Optional[str] = None
    ) -> List[Question]:
        """
        获取推荐复习的题目

        优先级：
        1. 已到期题目（next_review <= now）
        2. 按R值从低到高排序
        3. 新题目补充
        """
        now = datetime.now()

        # 查询条件基础
        base_query = db.query(Question)
        if subject:
            base_query = base_query.filter(Question.subject == subject)

        # 1. 获取到期题目
        due_questions = (
            base_query
            .join(LearningRecord, isouter=True)
            .filter(
                (LearningRecord.next_review <= now) |
                (LearningRecord.id == None)  # 新题目
            )
            .order_by(LearningRecord.retrievability.asc().nulls_first())
            .limit(limit)
            .all()
        )

        return due_questions

    def update_after_review(
        self,
        db: Session,
        question_id: int,
        rating: Rating,
        is_correct: bool
    ) -> LearningRecord:
        """
        答题后更新FSRS参数

        Args:
            db: 数据库会话
            question_id: 题目ID
            rating: FSRS评分 (1-4)
            is_correct: 是否答对

        Returns:
            更新后的学习记录
        """
        now = datetime.now(timezone.utc)

        # 获取或创建学习记录
        record = db.query(LearningRecord).filter(
            LearningRecord.question_id == question_id
        ).first()

        if not record:
            record = LearningRecord(question_id=question_id)
            db.add(record)

        # 创建FSRS Card
        if record.difficulty is not None and record.stability is not None:
            # 已有学习记录，恢复卡片状态
            card = Card(
                difficulty=record.difficulty,
                stability=record.stability,
                last_review=record.last_review.replace(tzinfo=timezone.utc) if record.last_review else None,
                due=record.next_review.replace(tzinfo=timezone.utc) if record.next_review else now,
                state=State.Review
            )
        else:
            # 新卡片
            card = Card()

        # 使用FSRS算法更新
        updated_card, review_log = self.scheduler.review_card(card, rating, now)

        # 更新记录
        record.difficulty = updated_card.difficulty
        record.stability = updated_card.stability
        record.last_review = now.replace(tzinfo=None)
        record.next_review = updated_card.due.replace(tzinfo=None) if updated_card.due.tzinfo else updated_card.due
        record.retrievability = self.scheduler.get_card_retrievability(updated_card, now)
        record.review_count += 1
        record.last_rating = rating.value

        if not is_correct:
            record.mistake_count += 1

        db.commit()
        db.refresh(record)

        return record

    def _calculate_retrievability(
        self,
        stability: float,
        now: datetime,
        due: datetime
    ) -> float:
        """
        计算可提取性概率 R
        R = (1 + t/(9*S))^(-1)，t为距上次复习的天数
        """
        if stability <= 0:
            return 0.0

        days_since_review = (due - now).days + stability
        t = max(0, stability - days_since_review)

        return (1 + t / (9 * stability)) ** -1

    def get_statistics(self, db: Session) -> dict:
        """获取学习统计"""
        total = db.query(Question).count()
        learned = db.query(LearningRecord).filter(
            LearningRecord.review_count > 0
        ).count()

        # 今日到期
        today = datetime.now().date()
        due_today = db.query(LearningRecord).filter(
            LearningRecord.next_review != None,
            LearningRecord.next_review <= datetime.now()
        ).count()

        # 正确率
        total_answers = db.query(AnswerHistory).count()
        correct_answers = db.query(AnswerHistory).filter(
            AnswerHistory.is_correct == True
        ).count()
        accuracy = correct_answers / total_answers if total_answers > 0 else 0

        return {
            "total_questions": total,
            "learned": learned,
            "due_today": due_today,
            "accuracy_rate": round(accuracy * 100, 1)
        }