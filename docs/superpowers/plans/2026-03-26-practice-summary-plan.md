# 刷题总结功能实施计划

## 1. 后端实现
### 1.1 扩展 Schema (`backend/app/schemas/practice.py`)
- [x] 定义 `PracticeSessionSummaryRequest`: `question_ids`, `start_time`
- [x] 定义 `MasteryDelta`: `newly_mastered`, `moved_to_learning`, `total_learned`
- [x] 定义 `PracticeSessionSummaryResponse`: `accuracy`, `correct_count`, `total_count`, `total_time_spent`, `mastery_delta`

### 1.2 实现 API 接口 (`backend/app/api/practice.py`)
- [ ] 增加 `@router.post("/summary", response_model=PracticeSessionSummaryResponse)`
- [ ] 实现逻辑：
    - 查询 `AnswerHistory` 获取指定题目和时间段内的记录，计算正确率和时间。
    - 查询 `LearningRecord` 结合 `start_time` 计算 FSRS 状态量。

## 2. 前端实现
### 2.1 更新 API 服务 (`frontend/src/services/api.ts`)
- [ ] 在 `practiceApi` 中添加 `getSummary` 方法。

### 2.2 扩展 Practice 逻辑 (`frontend/src/pages/Practice.tsx`)
- [ ] 在 `PracticeState` 中增加 `sessionStats` (追踪 correctCount, totalCount, totalTime, startTime)。
- [ ] 在 `handleAnswer` 中累加 `correctCount`。
- [ ] 修改 `handleRate` 逻辑：若批次完毕，切换到 `summary` 阶段。
- [ ] 调用后端 `summary` 接口并存储结果。

### 2.3 创建 UI 组件 (`frontend/src/components/PracticeSummary.tsx`)
- [ ] 使用 Tailwind 展示汇总卡片。
- [ ] 展示准确率、用时、FSRS 进度统计。
- [ ] 按钮：“继续学习”和“结束练习”。

## 3. 验证与测试
- [ ] 完成 20 题，验证是否停在总结页。
- [ ] 检查总结页数据准确性。
- [ ] 测试“继续学习”按钮。
