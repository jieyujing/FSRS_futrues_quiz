# 期货刷题助手 后端统计加载性能优化方案

## 1. 目标 (Goals)
*   **显著加速首页加载**：将“读取题库数据”的等待时间从目前的秒级缩短至毫秒级（100ms以内）。
*   **解决 N+1 查询问题**：将统计每个科目进度时的多条 SQL 查询合并为一次聚合查询。
*   **全表扫描优化**：为关键过滤与分组字段添加数据库索引。

## 2. 技术设计 (Technical Design)

### 2.1 数据库索引升级 (Indexing Upgrade)
为以下表的列添加 `index=True`，以支持高效的数据过滤与统计：
*   **questions 表**：`subject` 列。
*   **learning_records 表**：`next_review` 列。
*   **answer_history 表**：`is_correct` 列。

### 2.2 Dashboard 统计聚合 (Dashboard Query Aggregation)
重写 `backend/app/api/practice.py` 中的 `get_dashboard` 路由逻辑：
*   **旧方案**：
    1.  `SELECT DISTINCT subject FROM questions;`
    2.  循环遍历每一个 `subject`。
    3.  `SELECT count(*) FROM questions WHERE subject='...';`
    4.  `SELECT count(*) FROM learning_records JOIN questions ... WHERE subject='...' AND review_count > 0;` (产生 N+1)
*   **新方案**：
    1.  使用 SQLAlchemy 的聚合函数 (`func.count`, `func.sum`)。
    2.  编写一条聚合查询语句：
        ```python
        db.query(
            Question.subject,
            func.count(Question.id).label("total"),
            func.sum(case((LearningRecord.review_count > 0, 1), else_=0)).label("learned")
        ).outerjoin(
            LearningRecord, Question.id == LearningRecord.question_id
        ).group_by(Question.subject).all()
        ```
    3.  通过一次 JOIN + GROUP BY 获取所有科目的核心统计。

### 2.3 FSRS 统计逻辑精简
*   在 `fsrs_service.py` 的 `get_statistics` 中，尽量合并 count 统计。

## 3. 成功标准 (Success Criteria)
*   首页“读取题库数据”的状态显示极其短暂，几乎瞬时显示统计。
*   后端日志中，每个 `dashboard` 请求应只触发 1-2 条 SQL 语句，而非数十条。
