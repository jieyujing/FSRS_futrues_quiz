# 首页统计加载性能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 显著加速题库首页统计数据的加载速度。

**Architecture:** 后端通过数据库索引加速过滤，并使用 SQL 聚合函数合并多条查询。

**Tech Stack:** FastAPI, SQLAlchemy, SQLite.

---

### Task 1: 建立关键数据库索引

**Files:**
- Modify: `backend/app/models/question.py`
- Modify: `backend/app/models/learning_record.py`

- [ ] **Step 1: 给 Question.subject 添加索引**
修改 `question.py`，将 `subject = Column(String(50), nullable=False, ...)` 改为 `subject = Column(String(50), nullable=False, index=True, ...)`.

- [ ] **Step 2: 给 LearningRecord.next_review 添加索引**
修改 `learning_record.py`，将 `next_review = Column(DateTime, ...)` 改为 `next_review = Column(DateTime, index=True, ...)`.

- [ ] **Step 3: 给 AnswerHistory.is_correct 添加索引**
修改 `learning_record.py`，将 `is_correct = Column(Boolean, ...)` 改为 `is_correct = Column(Boolean, index=True, ...)`.

- [ ] **Step 4: 数据库自动同步**
运行 `start.sh` 或手动触发 `backend/app/main.py` 的启动逻辑（`Base.metadata.create_all` 会为现有表尝试通过 SQLAlchemy 处理后续的反射，但在 SQLite 中如果表已存在且手动修改代码，建议重启后端服务确保逻辑一致）。

---

### Task 2: 重写 get_dashboard 聚合查询

**Files:**
- Modify: `backend/app/api/practice.py`

- [ ] **Step 1: 引入聚合函数**
在 `backend/app/api/practice.py` 头部引入 `func`, `case`:
```python
from sqlalchemy import func, case
```

- [ ] **Step 2: 重写 get_dashboard 函数核心逻辑**
将原有的 `for` 循环替换为一条聚合查询。
```python
# 修改后的聚合逻辑示例
results = db.query(
    Question.subject,
    func.count(Question.id).label("total"),
    func.sum(case((LearningRecord.review_count > 0, 1), else_=0)).label("learned")
).outerjoin(
    LearningRecord, Question.id == LearningRecord.question_id
).group_by(Question.subject).all()

subject_stats = [
    {
        "name": row[0],
        "total": row[1],
        "learned": row[2],
        "progress": round(row[2] / row[1] * 100, 1) if row[1] > 0 else 0
    }
    for row in results
]
```

- [ ] **Step 3: 运行并验证**
确认 API `/practice/dashboard` 返回的数据结构依然一致。

---

### Task 3: 优化 FSRS 统计服务

**Files:**
- Modify: `backend/app/services/fsrs_service.py`

- [ ] **Step 1: 合并 get_statistics 中的 count 查询**
减少多次 `count()` 对数据库的琐碎访问。

- [ ] **Step 2: 验证性能提升**
刷新首页，确认“读取题库数据”状态几乎瞬时消失。
