from fsrs import Scheduler, Card, Rating, State
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
import random
from ..models import Question, LearningRecord, AnswerHistory


class FSRSService:
    """FSRS 算法服务"""

    def __init__(self):
        self.scheduler = Scheduler()
        # 默认推荐比例
        self.target_ratios = {"单选": 0.45, "多选": 0.35, "判断": 0.20}

    def get_next_questions(
        self,
        db: Session,
        limit: int = 20,
        subject: Optional[str] = None
    ) -> List[Question]:
        """
        获取推荐复习的题目，强制保持题型比例平衡

        策略：
        对于每种目标题型（单选/多选/判断）：
        1. 优先获取已到期题目（复习优先）
        2. 如果该类型到期题不足，从新题目中补充
        3. 确保每种题型都有出镜机会，避免单一题型刷屏
        """
        now = datetime.now()
        all_selected = []
        selected_ids = set()

        # 基础查询
        base_query = db.query(Question)
        if subject:
            base_query = base_query.filter(Question.subject == subject)

        # 1. 针对每种题型分别分配名额
        for q_type, ratio in self.target_ratios.items():
            type_limit = max(1, int(limit * ratio))
            
            # (A) 查找该类型的到期题 (R < 0.9)
            due_qs = (
                base_query.join(LearningRecord)
                .filter(
                    LearningRecord.next_review <= now,
                    LearningRecord.is_ignored == False,
                    (Question.question_type == q_type) | (Question.question_type.like(f"%{q_type}%"))
                )
                .order_by(LearningRecord.retrievability.asc())
                .limit(type_limit)
                .all()
            )
            for q in due_qs:
                all_selected.append(q)
                selected_ids.add(q.id)
            
            # (B) 如果该类型到期题不足，从未学习的新题中补充
            if len(due_qs) < type_limit:
                needed = type_limit - len(due_qs)
                new_qs = (
                    base_query.join(LearningRecord, isouter=True)
                    .filter(
                        LearningRecord.id == None,
                        (Question.question_type == q_type) | (Question.question_type.like(f"%{q_type}%"))
                    )
                    .order_by(func.random()) # 新题随机展现
                    .limit(needed)
                    .all()
                )
                for q in new_qs:
                    all_selected.append(q)
                    selected_ids.add(q.id)

        # 2. 如果总体名额还没满（例如某种题型已在整个库中消耗殆尽），随机补齐
        if len(all_selected) < limit:
            remaining = limit - len(all_selected)
            extra_qs = (
                base_query.join(LearningRecord, isouter=True)
                .filter(~Question.id.in_(list(selected_ids) if selected_ids else [-1]))
                .order_by(func.random())
                .limit(remaining)
                .all()
            )
            all_selected.extend(extra_qs)

        # 3. 结果打乱，保证顺序不固定
        random.shuffle(all_selected)
        return all_selected[:limit]

    def get_mistake_questions(
        self,
        db: Session,
        limit: int = 20,
        subject: Optional[str] = None
    ) -> List[Question]:
        """获取错题，强制保持题型多样性"""
        now = datetime.now()
        all_selected = []
        selected_ids = set()

        base_query = db.query(Question)
        if subject:
            base_query = base_query.filter(Question.subject == subject)

        # 1. 针对每种题型分别分配名额
        for q_type, ratio in self.target_ratios.items():
            type_limit = max(1, int(limit * ratio))
            
            # (A) 优先查找该类型的错题
            mistake_qs = (
                base_query.join(LearningRecord)
                .filter(
                    LearningRecord.mistake_count > 0,
                    LearningRecord.is_ignored == False,
                    (Question.question_type == q_type) | (Question.question_type.like(f"%{q_type}%"))
                )
                .order_by(LearningRecord.mistake_count.desc(), func.random())
                .limit(type_limit)
                .all()
            )
            for q in mistake_qs:
                all_selected.append(q)
                selected_ids.add(q.id)
            
            # (B) 如果该类型错题不足，从所有该类型题目中补充（优先选择未学习或复习中的新题）
            if len(mistake_qs) < type_limit:
                needed = type_limit - len(mistake_qs)
                # 补充逻辑：优先未学习的新题 > 其次已学习但不是错题的
                # 为了简单和多样性，这里直接从全量新题/非错题中随机选
                fill_qs = (
                    base_query.join(LearningRecord, isouter=True)
                    .filter(
                        (LearningRecord.mistake_count == None) | (LearningRecord.mistake_count == 0),
                        (Question.question_type == q_type) | (Question.question_type.like(f"%{q_type}%"))
                    )
                    .order_by(func.random())
                    .limit(needed)
                    .all()
                )
                for q in fill_qs:
                    all_selected.append(q)
                    selected_ids.add(q.id)

        # 2. 补齐
        if len(all_selected) < limit:
            remaining = limit - len(all_selected)
            extra_qs = (
                base_query.join(LearningRecord, isouter=True)
                .filter(~Question.id.in_(list(selected_ids) if selected_ids else [-1]))
                .order_by(func.random())
                .limit(remaining)
                .all()
            )
            all_selected.extend(extra_qs)

        random.shuffle(all_selected)
        return all_selected[:limit]

    def mark_as_ignored(self, db: Session, question_id: int) -> bool:
        """将其标记为“已过滤/太简单”，不再练习"""
        record = db.query(LearningRecord).filter(
            LearningRecord.question_id == question_id
        ).first()

        if not record:
            record = LearningRecord(
                question_id=question_id,
                is_ignored=True,
                next_review=datetime.now() + timedelta(days=3650) # 设置为很久以后复习
            )
            db.add(record)
        else:
            record.is_ignored = True
            record.next_review = datetime.now() + timedelta(days=3650)
            
        db.commit()
        return True

    def update_after_review(
        self,
        db: Session,
        question_id: int,
        rating: Rating,
        is_correct: bool
    ) -> LearningRecord:
        """
        答题后更新 FSRS 参数

        Args:
            db: 数据库会话
            question_id: 题目 ID
            rating: FSRS 评分 (1-4)
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

        # 创建 FSRS Card
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

        # 使用 FSRS 算法更新
        updated_card, review_log = self.scheduler.review_card(card, rating, now)

        # 更新记录
        record.difficulty = updated_card.difficulty
        record.stability = updated_card.stability
        record.last_review = now.replace(tzinfo=None)
        record.next_review = updated_card.due.replace(tzinfo=None) if updated_card.due.tzinfo else updated_card.due
        record.retrievability = self.scheduler.get_card_retrievability(updated_card, now)
        record.review_count = (record.review_count or 0) + 1
        record.last_rating = rating.value

        if not is_correct:
            record.mistake_count = (record.mistake_count or 0) + 1

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
        R = (1 + t/(9*S))^(-1)，t 为距上次复习的天数
        """
        if stability <= 0:
            return 0.0

        days_since_review = (due - now).days + stability
        t = max(0, stability - days_since_review)

        return (1 + t / (9 * stability)) ** -1

    def get_statistics(self, db: Session) -> dict:
        """获取学习统计"""
        # 1. 题目与学习进度统计 (已增加索引)
        total = db.query(Question).count()
        learned = db.query(LearningRecord).filter(
            (LearningRecord.review_count > 0) | (LearningRecord.is_ignored == True)
        ).count()

        # 2. 今日到期统计 (已增加索引)
        due_today = db.query(LearningRecord).filter(
            LearningRecord.next_review != None,
            LearningRecord.next_review <= datetime.now(),
            LearningRecord.is_ignored == False
        ).count()

        # 3. 答题正确率统计 (合并为单条查询)
        ans_stats = db.query(
            func.count(AnswerHistory.id).label("total"),
            func.sum(case((AnswerHistory.is_correct == True, 1), else_=0)).label("correct")
        ).first()

        total_answers = ans_stats.total or 0
        correct_answers = int(ans_stats.correct or 0)
        accuracy = correct_answers / total_answers if total_answers > 0 else 0

        return {
            "total_questions": total,
            "learned": learned,
            "due_today": due_today,
            "accuracy_rate": round(accuracy * 100, 1)
        }

    def get_fsrs_statistics(self, db: Session) -> dict:
        """获取 FSRS 详细统计"""
        now = datetime.now()

        # 1. 按掌握程度分布
        # 基于 Stability (S) 而非瞬时 Retrievability (R)
        # S >= 15: 熟练掌握 (约2周)
        # S >= 5:  基本掌握 (约5天)
        # S < 5:   正在学习
        # 另外通过 R < 0.7 判定需要复习
        master_stats = db.query(
            func.sum(case(((LearningRecord.is_ignored == True) | ((LearningRecord.stability >= 15.0) & (LearningRecord.retrievability >= 0.7)), 1), else_=0)).label("mastered"),
            func.sum(case(((LearningRecord.stability >= 5.0) & (LearningRecord.stability < 15.0) & (LearningRecord.retrievability >= 0.7) & (LearningRecord.is_ignored == False), 1), else_=0)).label("proficient"),
            func.sum(case(((LearningRecord.stability < 5.0) & (LearningRecord.retrievability >= 0.7) & (LearningRecord.is_ignored == False), 1), else_=0)).label("learning"),
            func.sum(case(((LearningRecord.retrievability < 0.7) & (LearningRecord.is_ignored == False), 1), else_=0)).label("review_needed")
        ).filter(
            (LearningRecord.review_count > 0) | (LearningRecord.is_ignored == True)
        ).first()

        mastered = int(master_stats.mastered or 0) if master_stats else 0
        proficient = int(master_stats.proficient or 0) if master_stats else 0
        learning = int(master_stats.learning or 0) if master_stats else 0
        review_needed = int(master_stats.review_needed or 0) if master_stats else 0

        # 2. 平均保留率
        avg_retrievability = db.query(
            func.avg(LearningRecord.retrievability)
        ).filter(
            LearningRecord.retrievability != None
        ).scalar() or 0

        # 3. 平均稳定性（天）
        avg_stability = db.query(
            func.avg(LearningRecord.stability)
        ).filter(
            LearningRecord.stability != None
        ).scalar() or 0

        # 4. 平均难度
        avg_difficulty = db.query(
            func.avg(LearningRecord.difficulty)
        ).filter(
            LearningRecord.difficulty != None
        ).scalar() or 0

        # 5. 总复习次数和错误次数
        review_stats = db.query(
            func.sum(LearningRecord.review_count),
            func.sum(LearningRecord.mistake_count)
        ).filter(
            LearningRecord.review_count != None
        ).first()

        total_reviews = int(review_stats[0] or 0) if review_stats else 0
        total_mistakes = int(review_stats[1] or 0) if review_stats else 0

        # 6. 按评分分布
        rating_stats = db.query(
            func.sum(case((LearningRecord.last_rating == 1, 1), else_=0)).label("again"),
            func.sum(case((LearningRecord.last_rating == 2, 1), else_=0)).label("hard"),
            func.sum(case((LearningRecord.last_rating == 3, 1), else_=0)).label("good"),
            func.sum(case((LearningRecord.last_rating == 4, 1), else_=0)).label("easy")
        ).filter(
            LearningRecord.last_rating != None
        ).first()

        # 7. 学习进度（有学习记录 vs 总题目）
        total_with_records = db.query(LearningRecord).count()

        return {
            "mastery_distribution": {
                "mastered": mastered,
                "proficient": proficient,
                "learning": learning,
                "review_needed": review_needed
            },
            "average_retrievability": round(avg_retrievability * 100, 1),
            "average_stability": round(avg_stability, 1),
            "average_difficulty": round(avg_difficulty, 2),
            "total_reviews": total_reviews,
            "total_mistakes": total_mistakes,
            "rating_distribution": {
                "again": int(rating_stats.again or 0) if rating_stats else 0,
                "hard": int(rating_stats.hard or 0) if rating_stats else 0,
                "good": int(rating_stats.good or 0) if rating_stats else 0,
                "easy": int(rating_stats.easy or 0) if rating_stats else 0
            },
            "total_learned": total_with_records
        }
