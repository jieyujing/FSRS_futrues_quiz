# 练习总结与记忆追踪功能设计文档

## 1. 功能背景
用户希望在刷题过程中每题记录到数据库（FSRS记忆追踪），并在每 20 道题目完成后显示总结界面，展示本次练习的成果，并提供“继续学习”或“结束练习”的选择。

## 2. 系统架构设计

### 2.1 后端 API 扩展
新增 `/practice/summary` 接口，用于计算当前练习批次的统计数据。

- **URL**: `POST /practice/summary`
- **Request Body**:
  ```json
  {
    "question_ids": [1, 2, 3, ...],
    "start_time": "2023-10-27T10:00:00Z"
  }
  ```
- **Response**:
  ```json
  {
    "accuracy": 85.0,
    "correct_count": 17,
    "total_count": 20,
    "total_time_spent": 600,
    "mastery_delta": {
      "newly_mastered": 5,      
      "moved_to_learning": 10,   
      "total_learned": 15        
    }
  }
  ```

### 2.2 前端状态管理 (`Practice.tsx`)
扩展 `PracticeState` 以支持会话追踪：

```typescript
interface PracticeState {
  questions: Question[];
  currentIndex: number;
  phase: 'question' | 'result' | 'summary'; // 新增 summary 阶段
  sessionStats: {
    start_time: string;
    correct_count: number;
    total_time: number;
    question_ids: number[];
  };
  summaryData: any | null; // 存储后端返回的总结数据
}
```

### 2.3 流程逻辑
1. **开始阶段**：`loadQuestions` 时重置 `sessionStats`，记录当前题目 ID 列表。
2. **答题阶段**：
   - 每次 `recordAnswer` 成时，前端更新本地 `sessionStats` (正确数、累加耗时)。
3. **完成 20 题**：
   - 在第 20 题点击“评分”后，且 `currentIndex` 达到 `questions.length - 1` 时，切换到 `phase: 'summary'`。
   - 调用 `practiceApi.getSummary` 获取详细 FSRS 变化统计。
4. **总结阶段 (UI)**：
   - 展示 `PracticeSummary` 组件（新组件）。
   - 提供操作：“继续学习” (重刷 20 题) 或 “结束练习” (回主页)。

## 3. 核心统计逻辑说明
- **Newly Mastered**: 本次练习后，`retrievability >= 0.9` 且本次 `last_review` 在 `start_time` 之后的题目。
- **Moved to Learning**: 本次练习前没有学习记录，练习后有了记录。

## 4. UI/UX 设计要点
- 大字号展示百分比。
- “继续学习”按钮应设为主要动作（Primary Action）。
- 统计项使用卡片式网格布局。
