# 期货刷题助手实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个基于FSRS算法的期货从业考试刷题应用，支持题库导入、智能刷题、记忆追踪。

**Architecture:** FastAPI后端 + React前端，SQLite数据库，FSRS-4算法调度复习，Agno Agent解析题库。

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, fsrs, agno, React 18, TypeScript, Tailwind CSS, Recharts

---

## Phase 1: 后端基础架构

### Task 1: 创建后端项目结构

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`

**Step 1: 创建项目目录**

```bash
mkdir -p backend/app/api backend/app/models backend/app/services backend/app/schemas backend/data
```

**Step 2: 创建 requirements.txt**

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
python-docx==1.1.0
PyPDF2==3.0.1
fsrs==4.0.0
pydantic==2.5.3
python-multipart==0.0.6
aiofiles==23.2.1
```

**Step 3: 创建 app/__init__.py**

```python
# Backend application package
```

**Step 4: 创建 main.py - FastAPI入口**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="期货刷题助手 API",
    description="基于FSRS算法的期货从业考试刷题应用",
    version="0.1.0"
)

# CORS配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "期货刷题助手 API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

**Step 5: 验证后端启动**

```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Expected: 访问 http://localhost:8000/docs 看到 Swagger UI

---

### Task 2: 创建数据库模型

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/question.py`
- Create: `backend/app/models/learning_record.py`

**Step 1: 创建 database.py - 数据库连接**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "quiz.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite需要
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """依赖注入：获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2: 创建 models/__init__.py**

```python
from .question import Question
from .learning_record import LearningRecord, AnswerHistory

__all__ = ["Question", "LearningRecord", "AnswerHistory"]
```

**Step 3: 创建 models/question.py - 题目模型**

```python
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Question(Base):
    """题目表"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(50), nullable=False, comment="科目：基础知识/法律法规")
    source = Column(String(200), nullable=False, comment="来源文件名")
    question_type = Column(String(20), nullable=False, comment="题型：单选/多选/判断")
    question_number = Column(Integer, comment="原题号")
    content = Column(Text, nullable=False, comment="题目内容")
    options = Column(JSON, comment="选项：{'A': '...', 'B': '...', ...}")
    correct_answer = Column(String(20), nullable=False, comment="正确答案")
    explanation = Column(Text, comment="解析内容")
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Question(id={self.id}, type={self.question_type}, subject={self.subject})>"
```

**Step 4: 创建 models/learning_record.py - 学习记录模型**

```python
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
    next_review = Column(DateTime, comment="下次复习时间")

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
    is_correct = Column(Boolean, comment="是否正确")
    rating = Column(Integer, comment="FSRS评分 1-4")
    time_spent = Column(Integer, comment="答题时长（秒）")
    created_at = Column(DateTime, server_default=func.now())

    # 关系
    question = relationship("Question", backref="answer_history")
```

**Step 5: 更新 main.py 创建表**

在 `main.py` 末尾添加：

```python
from app.database import engine, Base
from app.models import Question, LearningRecord, AnswerHistory

# 启动时创建表
@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
```

**Step 6: 验证数据库创建**

```bash
cd backend && python -c "
from app.database import engine, Base
from app.models import Question, LearningRecord, AnswerHistory
Base.metadata.create_all(bind=engine)
print('数据库表创建成功')
import os
print(f'数据库文件: {os.path.exists(\"data/quiz.db\")}')"
```

Expected: 输出 "数据库表创建成功" 和 "数据库文件: True"

---

### Task 3: 创建 Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/question.py`
- Create: `backend/app/schemas/practice.py`

**Step 1: 创建 schemas/__init__.py**

```python
from .question import QuestionCreate, QuestionResponse
from .practice import AnswerSubmit, PracticeResult

__all__ = [
    "QuestionCreate", "QuestionResponse",
    "AnswerSubmit", "PracticeResult"
]
```

**Step 2: 创建 schemas/question.py**

```python
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
```

**Step 3: 创建 schemas/practice.py**

```python
from pydantic import BaseModel
from typing import Optional, Dict, List
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
    subjects: List[Dict[str, any]]
```

---

## Phase 2: FSRS服务与API

### Task 4: 创建FSRS服务

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/fsrs_service.py`

**Step 1: 创建 services/__init__.py**

```python
from .fsrs_service import FSRSService

__all__ = ["FSRSService"]
```

**Step 2: 创建 services/fsrs_service.py**

```python
from fsrs import FSRS, Card, Rating
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from ..models import Question, LearningRecord, AnswerHistory


class FSRSService:
    """FSRS算法服务"""

    def __init__(self):
        self.fsrs = FSRS()

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
        now = datetime.now()

        # 获取或创建学习记录
        record = db.query(LearningRecord).filter(
            LearningRecord.question_id == question_id
        ).first()

        if not record:
            record = LearningRecord(question_id=question_id)
            db.add(record)

        # 创建FSRS Card
        card = Card(
            difficulty=record.difficulty,
            stability=record.stability,
            last_review=record.last_review or now - timedelta(days=1)
        )

        # 使用FSRS算法更新
        scheduling_cards = self.fsrs.repeat(card, now)

        # 根据评分选择对应的调度结果
        rating_map = {
            Rating.AGAIN: "rating1",
            Rating.HARD: "rating2",
            Rating.GOOD: "rating3",
            Rating.EASY: "rating4"
        }
        updated_card = getattr(scheduling_cards, rating_map[rating]).card

        # 更新记录
        record.difficulty = updated_card.difficulty
        record.stability = updated_card.stability
        record.last_review = now
        record.next_review = updated_card.due
        record.retrievability = self._calculate_retrievability(
            updated_card.stability, now, updated_card.due
        )
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
```

---

### Task 5: 创建题目API

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/questions.py`

**Step 1: 创建 api/__init__.py**

```python
from .questions import router as questions_router
from .practice import router as practice_router
from .import_api import router as import_router

__all__ = ["questions_router", "practice_router", "import_router"]
```

**Step 2: 创建 api/questions.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Question
from ..schemas.question import (
    QuestionCreate,
    QuestionResponse,
    QuestionListItem,
    QuestionStats
)
from collections import Counter

router = APIRouter(prefix="/questions", tags=["题目管理"])


@router.get("/", response_model=List[QuestionListItem])
def list_questions(
    skip: int = 0,
    limit: int = 100,
    subject: str = None,
    question_type: str = None,
    db: Session = Depends(get_db)
):
    """获取题目列表（不含答案）"""
    query = db.query(Question)

    if subject:
        query = query.filter(Question.subject == subject)
    if question_type:
        query = query.filter(Question.question_type == question_type)

    return query.offset(skip).limit(limit).all()


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    """获取单个题目详情"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.post("/", response_model=QuestionResponse)
def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """创建题目"""
    db_question = Question(**question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@router.delete("/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    """删除题目"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    db.delete(question)
    db.commit()
    return {"message": "删除成功"}


@router.get("/stats/overview", response_model=QuestionStats)
def get_stats(db: Session = Depends(get_db)):
    """获取题库统计"""
    questions = db.query(Question).all()

    by_subject = Counter(q.subject for q in questions)
    by_type = Counter(q.question_type for q in questions)

    return QuestionStats(
        total=len(questions),
        by_subject=dict(by_subject),
        by_type=dict(by_type)
    )
```

---

### Task 6: 创建练习API

**Files:**
- Create: `backend/app/api/practice.py`

**Step 1: 创建 api/practice.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Question, LearningRecord, AnswerHistory
from ..schemas.practice import (
    AnswerSubmit,
    PracticeResult,
    RatingSubmit,
    PracticeQuestion,
    DashboardStats
)
from ..services.fsrs_service import FSRSService
from datetime import datetime
from fsrs import Rating

router = APIRouter(prefix="/practice", tags=["刷题练习"])
fsrs_service = FSRSService()


@router.get("/next", response_model=List[PracticeQuestion])
def get_next_questions(
    limit: int = 20,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取下一批练习题目"""
    questions = fsrs_service.get_next_questions(db, limit, subject)

    result = []
    for q in questions:
        record = db.query(LearningRecord).filter(
            LearningRecord.question_id == q.id
        ).first()

        pq = PracticeQuestion(
            id=q.id,
            question_type=q.question_type,
            content=q.content,
            options=q.options,
            retrievability=record.retrievability if record else None,
            next_review=record.next_review if record else None
        )
        result.append(pq)

    return result


@router.post("/answer", response_model=PracticeResult)
def submit_answer(answer: AnswerSubmit, db: Session = Depends(get_db)):
    """提交答案"""
    question = db.query(Question).filter(
        Question.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 判断答案是否正确
    user_answer = answer.user_answer.upper().strip()
    correct_answer = question.correct_answer.upper().strip()

    # 判断题特殊处理
    if question.question_type == "判断":
        answer_map = {"正确": "T", "错误": "F", "对": "T", "错": "F"}
        user_answer = answer_map.get(user_answer, user_answer)

    is_correct = user_answer == correct_answer

    # 获取FSRS参数
    record = db.query(LearningRecord).filter(
        LearningRecord.question_id == question.id
    ).first()

    return PracticeResult(
        question_id=question.id,
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        current_stability=record.stability if record else 1.0,
        current_difficulty=record.difficulty if record else 0.3
    )


@router.post("/rate")
def submit_rating(rating: RatingSubmit, db: Session = Depends(get_db)):
    """提交FSRS评分，更新学习记录"""
    # 获取最近一次答题记录
    answer = db.query(AnswerHistory).filter(
        AnswerHistory.question_id == rating.question_id
    ).order_by(AnswerHistory.created_at.desc()).first()

    if not answer:
        raise HTTPException(status_code=400, detail="请先提交答案")

    # 更新FSRS参数
    record = fsrs_service.update_after_review(
        db,
        rating.question_id,
        Rating(rating.rating),
        answer.is_correct
    )

    # 更新答题历史
    answer.rating = rating.rating
    db.commit()

    return {
        "message": "评分成功",
        "next_review": record.next_review,
        "stability": record.stability,
        "difficulty": record.difficulty
    }


@router.post("/record-answer")
def record_answer(answer: AnswerSubmit, db: Session = Depends(get_db)):
    """记录答题历史（评分前调用）"""
    question = db.query(Question).filter(
        Question.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 判断答案是否正确
    user_answer = answer.user_answer.upper().strip()
    correct_answer = question.correct_answer.upper().strip()

    if question.question_type == "判断":
        answer_map = {"正确": "T", "错误": "F", "对": "T", "错": "F"}
        user_answer = answer_map.get(user_answer, user_answer)

    is_correct = user_answer == correct_answer

    # 记录答题历史
    history = AnswerHistory(
        question_id=question.id,
        user_answer=answer.user_answer,
        is_correct=is_correct,
        time_spent=answer.time_spent
    )
    db.add(history)
    db.commit()

    return {"recorded": True, "is_correct": is_correct}


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    """获取首页统计数据"""
    stats = fsrs_service.get_statistics(db)

    # 按科目统计
    subjects = db.query(Question.subject).distinct().all()
    subject_stats = []

    for (subject_name,) in subjects:
        total = db.query(Question).filter(
            Question.subject == subject_name
        ).count()
        learned = db.query(LearningRecord).join(Question).filter(
            Question.subject == subject_name,
            LearningRecord.review_count > 0
        ).count()

        subject_stats.append({
            "name": subject_name,
            "total": total,
            "learned": learned,
            "progress": round(learned / total * 100, 1) if total > 0 else 0
        })

    return DashboardStats(
        total_questions=stats["total_questions"],
        learned=stats["learned"],
        due_today=stats["due_today"],
        accuracy_rate=stats["accuracy_rate"],
        subjects=subject_stats
    )
```

---

### Task 7: 更新main.py注册路由

**Files:**
- Modify: `backend/app/main.py`

**Step 1: 更新 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import Question, LearningRecord, AnswerHistory
from app.api import questions_router, practice_router, import_router

# 创建应用
app = FastAPI(
    title="期货刷题助手 API",
    description="基于FSRS算法的期货从业考试刷题应用",
    version="0.1.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(questions_router)
app.include_router(practice_router)
app.include_router(import_router)


@app.on_event("startup")
async def startup():
    """启动时创建数据库表"""
    Base.metadata.create_all(bind=engine)


@app.get("/")
async def root():
    return {"message": "期货刷题助手 API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Phase 3: 题库导入与Agno Agent

### Task 8: 创建题库导入API

**Files:**
- Create: `backend/app/api/import_api.py`
- Create: `backend/app/services/parser_service.py`

**Step 1: 创建 services/parser_service.py（暂不用Agno，先用正则）**

```python
from docx import Document
from typing import List, Dict, Optional
import re


class QuestionParser:
    """题库解析服务"""

    def parse_docx(self, file_path: str) -> List[Dict]:
        """
        解析docx文件，提取题目

        返回格式：
        [{
            "question_number": 1,
            "content": "题目内容",
            "options": {"A": "...", "B": "...", ...},
            "correct_answer": "B",
            "explanation": "解析内容"
        }]
        """
        doc = Document(file_path)
        questions = []

        current_question = None
        current_content = []
        current_options = {}

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # 检测题目编号
            question_match = re.match(r"第\s*(\d+)\s*题", text)
            if question_match:
                # 保存上一题
                if current_question:
                    current_question["content"] = "\n".join(current_content)
                    current_question["options"] = current_options
                    questions.append(current_question)

                # 开始新题
                current_question = {
                    "question_number": int(question_match.group(1)),
                    "content": "",
                    "options": {},
                    "correct_answer": "",
                    "explanation": ""
                }
                current_content = []
                current_options = {}
                continue

            # 检测选项
            option_match = re.match(r"￼\s*([A-D])\.(.+)", text)
            if option_match and current_question:
                option_key = option_match.group(1)
                option_value = option_match.group(2).strip()
                current_options[option_key] = option_value
                continue

            # 检测正确答案
            answer_match = re.match(r"正确答案[：:]\s*([A-D]+)", text)
            if answer_match and current_question:
                current_question["correct_answer"] = answer_match.group(1)
                continue

            # 检测解析
            if "名师解析" in text or "解析" in text:
                continue

            # 普通文本作为题目内容
            if current_question and not current_question.get("correct_answer"):
                current_content.append(text)
            elif current_question and current_question.get("correct_answer"):
                # 解析内容
                current_question["explanation"] += text + "\n"

        # 保存最后一题
        if current_question:
            current_question["content"] = "\n".join(current_content)
            current_question["options"] = current_options
            questions.append(current_question)

        return questions

    def parse_docx_with_answers(
        self,
        question_file: str,
        answer_file: str
    ) -> List[Dict]:
        """
        分别解析题目文件和解析文件，合并结果
        """
        questions = self.parse_docx(question_file)
        answers = self.parse_docx(answer_file)

        # 合并答案和解析
        for q in questions:
            for a in answers:
                if q["question_number"] == a["question_number"]:
                    q["correct_answer"] = a.get("correct_answer", "")
                    q["explanation"] = a.get("explanation", "")
                    break

        return questions
```

**Step 2: 创建 api/import_api.py**

```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import tempfile
from ..database import get_db
from ..models import Question
from ..services.parser_service import QuestionParser

router = APIRouter(prefix="/import", tags=["题库导入"])
parser = QuestionParser()


@router.post("/docx")
async def import_docx(
    file: UploadFile = File(...),
    subject: str = "基础知识",
    db: Session = Depends(get_db)
):
    """
    导入单个docx文件

    文件名格式：2023年5月LC押题 基础第一套.docx
    """
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="只支持docx文件")

    # 保存临时文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 解析文件
        questions = parser.parse_docx(tmp_path)

        # 存入数据库
        source = file.filename.replace(".docx", "")
        added_count = 0

        for q in questions:
            if not q.get("content") or not q.get("options"):
                continue

            db_question = Question(
                subject=subject,
                source=source,
                question_type="单选",  # 默认单选
                question_number=q.get("question_number"),
                content=q["content"],
                options=q["options"],
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", "")
            )
            db.add(db_question)
            added_count += 1

        db.commit()

        return {
            "message": "导入成功",
            "filename": file.filename,
            "total_parsed": len(questions),
            "added": added_count
        }
    finally:
        os.unlink(tmp_path)


@router.post("/docx-pair")
async def import_docx_pair(
    question_file: UploadFile = File(...),
    answer_file: UploadFile = File(...),
    subject: str = "基础知识",
    db: Session = Depends(get_db)
):
    """
    导入题目+解析文件对
    """
    # 保存临时文件
    q_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    a_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")

    try:
        q_tmp.write(await question_file.read())
        a_tmp.write(await answer_file.read())
        q_tmp.close()
        a_tmp.close()

        # 解析
        questions = parser.parse_docx_with_answers(q_tmp.name, a_tmp.name)

        # 存入数据库
        source = question_file.filename.replace(".docx", "")
        added_count = 0

        for q in questions:
            if not q.get("content") or not q.get("options"):
                continue

            db_question = Question(
                subject=subject,
                source=source,
                question_type="单选",
                question_number=q.get("question_number"),
                content=q["content"],
                options=q["options"],
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", "")
            )
            db.add(db_question)
            added_count += 1

        db.commit()

        return {
            "message": "导入成功",
            "questions_file": question_file.filename,
            "answers_file": answer_file.filename,
            "total_parsed": len(questions),
            "added": added_count
        }
    finally:
        os.unlink(q_tmp.name)
        os.unlink(a_tmp.name)


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    """列出所有已导入的题库来源"""
    sources = db.query(Question.source).distinct().all()
    return [{"source": s[0], "count": db.query(Question).filter(Question.source == s[0]).count()} for s in sources]


@router.delete("/source/{source_name}")
def delete_by_source(source_name: str, db: Session = Depends(get_db)):
    """删除指定来源的所有题目"""
    count = db.query(Question).filter(Question.source == source_name).delete()
    db.commit()
    return {"message": f"已删除 {count} 道题目"}
```

---

## Phase 4: 前端开发

### Task 9: 创建React项目

**Step 1: 初始化前端项目**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom axios tailwindcss postcss autoprefixer recharts lucide-react
npx tailwindcss init -p
```

**Step 2: 配置 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 3: 添加Tailwind到 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### Task 10: 创建API服务

**Files:**
- Create: `frontend/src/services/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 题目相关
export const questionApi = {
  list: (params?: { subject?: string; type?: string }) =>
    api.get('/questions/', { params }),
  get: (id: number) => api.get(`/questions/${id}`),
  stats: () => api.get('/questions/stats/overview'),
  delete: (id: number) => api.delete(`/questions/${id}`),
};

// 练习相关
export const practiceApi = {
  getNext: (limit = 20, subject?: string) =>
    api.get('/practice/next', { params: { limit, subject } }),
  answer: (data: { question_id: number; user_answer: string; time_spent?: number }) =>
    api.post('/practice/answer', data),
  recordAnswer: (data: { question_id: number; user_answer: string; time_spent?: number }) =>
    api.post('/practice/record-answer', data),
  rate: (data: { question_id: number; rating: number }) =>
    api.post('/practice/rate', data),
  dashboard: () => api.get('/practice/dashboard'),
};

// 导入相关
export const importApi = {
  docx: (file: File, subject: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    return api.post('/import/docx', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  docxPair: (questionFile: File, answerFile: File, subject: string) => {
    const formData = new FormData();
    formData.append('question_file', questionFile);
    formData.append('answer_file', answerFile);
    formData.append('subject', subject);
    return api.post('/import/docx-pair', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  sources: () => api.get('/import/sources'),
  deleteSource: (source: string) => api.delete(`/import/source/${source}`),
};

export default api;
```

---

### Task 11: 创建题目卡片组件

**Files:**
- Create: `frontend/src/components/QuestionCard.tsx`

```typescript
import React, { useState } from 'react';

interface Option {
  [key: string]: string;
}

interface QuestionCardProps {
  id: number;
  questionType: string;
  content: string;
  options?: Option;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  questionType,
  content,
  options,
  onAnswer,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<string>('');

  const handleSelect = (key: string) => {
    if (disabled) return;
    setSelected(key);
  };

  const handleSubmit = () => {
    if (selected) {
      onAnswer(selected);
    }
  };

  const renderOptions = () => {
    if (questionType === '判断') {
      return (
        <div className="space-y-3">
          {['正确', '错误'].map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={disabled}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                selected === opt
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    // 单选/多选
    const isMultiple = questionType === '多选';

    return (
      <div className="space-y-3">
        {options &&
          Object.entries(options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={disabled}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                selected === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <span className="font-medium mr-2">{key}.</span>
              {value}
            </button>
          ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
          {questionType}
        </span>
      </div>

      <div className="mb-6 text-gray-800 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {renderOptions()}

      <button
        onClick={handleSubmit}
        disabled={!selected || disabled}
        className={`mt-6 w-full py-3 rounded-lg font-medium transition-all ${
          selected && !disabled
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        提交答案
      </button>
    </div>
  );
};

export default QuestionCard;
```

---

### Task 12: 创建答题结果组件

**Files:**
- Create: `frontend/src/components/AnswerResult.tsx`

```typescript
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AnswerResultProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  onRate: (rating: number) => void;
  onNext: () => void;
}

const AnswerResult: React.FC<AnswerResultProps> = ({
  isCorrect,
  correctAnswer,
  explanation,
  onRate,
  onNext,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 结果头部 */}
      <div className={`flex items-center gap-2 mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {isCorrect ? (
          <>
            <CheckCircle className="w-6 h-6" />
            <span className="text-lg font-medium">正确!</span>
          </>
        ) : (
          <>
            <XCircle className="w-6 h-6" />
            <span className="text-lg font-medium">错误</span>
          </>
        )}
      </div>

      {/* 正确答案 */}
      <div className="mb-4">
        <span className="text-gray-600">正确答案：</span>
        <span className="font-medium text-gray-900">{correctAnswer}</span>
      </div>

      {/* 解析 */}
      {explanation && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-2">解析</div>
          <div className="text-gray-700 whitespace-pre-wrap">{explanation}</div>
        </div>
      )}

      {/* FSRS评分 */}
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-3">这道题你觉得怎么样？</div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onRate(1)}
            className="py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Again
          </button>
          <button
            onClick={() => onRate(2)}
            className="py-2 px-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
          >
            Hard
          </button>
          <button
            onClick={() => onRate(3)}
            className="py-2 px-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Good
          </button>
          <button
            onClick={() => onRate(4)}
            className="py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Easy
          </button>
        </div>
      </div>

      {/* 下一题按钮 */}
      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
      >
        下一题
      </button>
    </div>
  );
};

export default AnswerResult;
```

---

### Task 13: 创建刷题页面

**Files:**
- Create: `frontend/src/pages/Practice.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { practiceApi } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import AnswerResult from '../components/AnswerResult';

interface Question {
  id: number;
  question_type: string;
  content: string;
  options?: { [key: string]: string };
}

interface PracticeState {
  questions: Question[];
  currentIndex: number;
  phase: 'question' | 'result';
  lastAnswer: {
    questionId: number;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null;
}

const Practice: React.FC = () => {
  const [state, setState] = useState<PracticeState>({
    questions: [],
    currentIndex: 0,
    phase: 'question',
    lastAnswer: null,
  });

  const [loading, setLoading] = useState(true);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const response = await practiceApi.getNext(20);
      setState(prev => ({
        ...prev,
        questions: response.data,
        currentIndex: 0,
        phase: 'question',
        lastAnswer: null,
      }));
    } catch (error) {
      console.error('加载题目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleAnswer = async (answer: string) => {
    const currentQuestion = state.questions[state.currentIndex];
    if (!currentQuestion) return;

    try {
      // 先记录答案
      await practiceApi.recordAnswer({
        question_id: currentQuestion.id,
        user_answer: answer,
      });

      // 获取结果
      const response = await practiceApi.answer({
        question_id: currentQuestion.id,
        user_answer: answer,
      });

      setState(prev => ({
        ...prev,
        phase: 'result',
        lastAnswer: {
          questionId: currentQuestion.id,
          isCorrect: response.data.is_correct,
          correctAnswer: response.data.correct_answer,
          explanation: response.data.explanation,
        },
      }));
    } catch (error) {
      console.error('提交答案失败:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!state.lastAnswer) return;

    try {
      await practiceApi.rate({
        question_id: state.lastAnswer.questionId,
        rating,
      });
    } catch (error) {
      console.error('评分失败:', error);
    }
  };

  const handleNext = useCallback(() => {
    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      // 加载更多题目
      loadQuestions();
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        phase: 'question',
        lastAnswer: null,
      }));
    }
  }, [state.currentIndex, state.questions.length]);

  const currentQuestion = state.questions[state.currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 mb-4">暂无题目</div>
        <button
          onClick={loadQuestions}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>进度</span>
          <span>{state.currentIndex + 1} / {state.questions.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((state.currentIndex + 1) / state.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 题目/结果 */}
      {state.phase === 'question' ? (
        <QuestionCard
          id={currentQuestion.id}
          questionType={currentQuestion.question_type}
          content={currentQuestion.content}
          options={currentQuestion.options}
          onAnswer={handleAnswer}
        />
      ) : (
        state.lastAnswer && (
          <AnswerResult
            isCorrect={state.lastAnswer.isCorrect}
            correctAnswer={state.lastAnswer.correctAnswer}
            explanation={state.lastAnswer.explanation}
            onRate={handleRate}
            onNext={handleNext}
          />
        )
      )}
    </div>
  );
};

export default Practice;
```

---

### Task 14: 创建首页Dashboard

**Files:**
- Create: `frontend/src/pages/Home.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { practiceApi } from '../services/api';
import { BookOpen, CheckCircle, Clock, Target } from 'lucide-react';

interface DashboardStats {
  total_questions: number;
  learned: number;
  due_today: number;
  accuracy_rate: number;
  subjects: Array<{
    name: string;
    total: number;
    learned: number;
    progress: number;
  }>;
}

const Home: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await practiceApi.dashboard();
      setStats(response.data);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">暂无数据，请先导入题库</div>
        <Link
          to="/bank"
          className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          导入题库
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">期货刷题助手</h1>
        <Link
          to="/practice"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          开始刷题
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">总题数</div>
              <div className="text-xl font-bold">{stats.total_questions}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">已学习</div>
              <div className="text-xl font-bold">{stats.learned}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">今日待复习</div>
              <div className="text-xl font-bold">{stats.due_today}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">正确率</div>
              <div className="text-xl font-bold">{stats.accuracy_rate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 科目进度 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">学习进度</h2>
        <div className="space-y-4">
          {stats.subjects.map((subject) => (
            <div key={subject.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{subject.name}</span>
                <span className="text-gray-500">
                  {subject.learned} / {subject.total}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${subject.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
```

---

### Task 15: 创建题库管理页面

**Files:**
- Create: `frontend/src/pages/QuestionBank.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { importApi, questionApi } from '../services/api';
import { Upload, Trash2, RefreshCw } from 'lucide-react';

interface Source {
  source: string;
  count: number;
}

const QuestionBank: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState('基础知识');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const response = await importApi.sources();
      setSources(response.data);
    } catch (error) {
      console.error('加载题库列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await importApi.docx(file, subject);
      alert(`导入成功！共添加 ${response.data.added} 道题目`);
      loadSources();
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请检查文件格式');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteSource = async (sourceName: string) => {
    if (!confirm(`确定要删除 "${sourceName}" 的所有题目吗？`)) return;

    try {
      await importApi.deleteSource(sourceName);
      loadSources();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">题库管理</h1>

      {/* 导入区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">导入题库</h2>

        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm text-gray-600">科目：</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="基础知识">基础知识</option>
            <option value="法律法规">法律法规</option>
          </select>
        </div>

        <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
          {uploading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              导入中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              点击上传 docx 文件
            </span>
          )}
          <input
            type="file"
            accept=".docx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* 已导入题库列表 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">已导入题库</h2>

        {loading ? (
          <div className="text-center py-4 text-gray-500">加载中...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-4 text-gray-500">暂无题库</div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{s.source}</div>
                  <div className="text-sm text-gray-500">{s.count} 道题目</div>
                </div>
                <button
                  onClick={() => handleDeleteSource(s.source)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
```

---

### Task 16: 创建App路由

**Files:**
- Create: `frontend/src/App.tsx`

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Practice from './pages/Practice';
import QuestionBank from './pages/QuestionBank';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        {/* 导航栏 */}
        <nav className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="font-bold text-xl text-blue-600">期货刷题</div>
              <div className="flex gap-4">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`
                  }
                >
                  首页
                </NavLink>
                <NavLink
                  to="/practice"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`
                  }
                >
                  刷题
                </NavLink>
                <NavLink
                  to="/bank"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`
                  }
                >
                  题库
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/bank" element={<QuestionBank />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
```

---

### Task 17: 更新main.tsx

**Files:**
- Modify: `frontend/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 启动指南

### 后端启动

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

### 访问应用

- 前端：http://localhost:5173
- 后端API：http://localhost:8000/docs

---

## 成功验证

1. **后端健康检查**：`curl http://localhost:8000/health` 返回 `{"status": "healthy"}`
2. **前端页面加载**：访问 http://localhost:5173 显示首页
3. **题库导入**：上传docx文件，能看到导入成功提示
4. **刷题功能**：能正常答题、评分、进入下一题