# 0002 — 统一题型枚举为四大类

## 状态：已决策

## 背景

数据库中实际存储了 9 种不同的 `question_type` 值（`单选`、`多选`、`判断`、`判断题`、`多选题`、`选择题`、`单选|多选|判断`、`多选|判断`、`综合`），原因是 LLM 解析 prompt 未严格约束题型名称，导致命名混乱。

手动查阅 PDF 原卷，确认题型只有四大类。

## 决策

统一为四种题型：**单选题 / 多选题 / 判断题 / 综合题**，加"题"字后缀保持命名一致。

## 选项取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 命名风格 | 统一加"题"字 | 系统内部一致性优于忠实 PDF 原文 |
| 综合题交互 | 等同多选题 | 数据结构一致，只是标签不同 |
| FSRS 比例 | 单选0.40/多选0.25/判断0.20/综合0.15 | 按实际分布加权，综合题保底至少1道 |
| 判断题前端渲染 | 走通用选项渲染，不硬编码"正确/错误" | 数据库判断题 options 格式不统一，硬编码会出 bug |
| 判断题判分逻辑 | 不做特殊映射，统一 `==` 比较 | 判断题和单选题完全同构 |
| 综合题 LLM prompt 规则 | 不加特殊规则 | 数据格式和多选题一致，通用规则足够 |
| 多选判定逻辑 | 抽成前端工具函数 `isMultiChoice()` | 消除重复代码，匹配 `'多选'` 或 `'综合'` |
| 混合脏数据 (`单选|多选|判断` 等) | 直接删除 | LLM 解析错误产物，数据质量不可信 |
| `选择题` 脏值 | 映射为 `单选题` | 17 道全部是单字符答案 |
| 判断题脏 options | 迁移时修正为标准格式 | 避免用户看到"不确定"等奇怪选项 |
| 数据库 CHECK 约束 | 不加 | SQLite 改约束麻烦，靠应用层保证 |
| 迁移执行方式 | 一次性脚本，事务内执行 + 备份 | 显式可审计，双保险 |

## 影响

- `backend/app/services/agent_parser.py` — LLM prompt 枚举改为四大类
- `backend/app/models/question.py` — comment 更新
- `backend/app/services/fsrs_service.py` — target_ratios 更新
- `backend/app/api/practice.py` — 删除判断题判分特殊逻辑
- `frontend/src/utils/` — 新增 `isMultiChoice()` 工具函数
- `frontend/src/components/QuestionCard.tsx` — 删除判断题硬编码渲染，引用工具函数
- `frontend/src/pages/Exam.tsx` — 引用工具函数
- `backend/scripts/migrate_question_types.py` — 新增迁移脚本
