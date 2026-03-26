---
name: 期货刷题助手设计文档
description: 基于FSRS算法的期货从业考试刷题应用设计
type: project
created: 2026-03-24
status: approved
---

# 期货刷题助手 - 设计文档

## 项目概述

一个基于FSRS（Free Spaced Repetition Scheduler）算法的期货从业考试刷题应用，帮助用户高效记忆期货基础知识和法律法规题库。

### 核心特性

- **FSRS智能调度**：根据记忆曲线自动安排复习计划
- **记忆追踪**：追踪每道题的记忆强度和稳定性
- **智能推荐**：优先推荐最需要复习的题目
- **统计分析**：可视化展示学习进度和记忆曲线
- **Agno Agent**：自动解析题库、提供学习建议

### 技术栈

- **后端**：Python + FastAPI + SQLAlchemy + FSRS-4 + Agno
- **前端**：React + TypeScript + Tailwind CSS
- **数据库**：SQLite
- **部署**：本地运行

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 题库导入  │ │ 刷题界面  │ │ 学习统计  │ │ 设置中心  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      API层 (FastAPI)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ /questions│ │/practice │ │/statistics│ │/import   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ FSRS调度 │ │ 题库管理  │ │ Agent服务 │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (SQLite)                          │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ 题库数据表    │  │ 学习记录表    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
future-quiz-app/
├── backend/                 # Python后端
│   ├── app/
│   │   ├── api/            # API路由
│   │   │   ├── questions.py
│   │   │   ├── practice.py
│   │   │   ├── statistics.py
│   │   │   └── import.py
│   │   ├── models/         # 数据模型
│   │   │   ├── question.py
│   │   │   └── learning_record.py
│   │   ├── services/       # 业务逻辑
│   │   │   ├── fsrs_service.py
│   │   │   └── agent_service.py
│   │   ├── schemas/        # Pydantic模型
│   │   └── main.py         # FastAPI入口
│   ├── data/               # SQLite数据库
│   └── requirements.txt
├── frontend/                # React前端
│   ├── src/
│   │   ├── components/     # UI组件
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── AnswerResult.tsx
│   │   │   └── StatsChart.tsx
│   │   ├── pages/          # 页面
│   │   │   ├── Home.tsx
│   │   │   ├── Practice.tsx
│   │   │   ├── QuestionBank.tsx
│   │   │   └── Statistics.tsx
│   │   ├── services/       # API调用
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── docs/
    └── plans/
```

---

## 数据模型

### questions（题目表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| subject | TEXT | 科目：基础知识/法律法规 |
| source | TEXT | 来源：2023年5月LC押题基础第一套 |
| question_type | TEXT | 题型：单选/多选/判断 |
| question_number | INTEGER | 原题号 |
| content | TEXT | 题目内容 |
| options | JSON | 选项：{"A": "...", "B": "...", ...} |
| correct_answer | TEXT | 正确答案：A / ABC / T |
| explanation | TEXT | 解析内容 |
| created_at | TIMESTAMP | 创建时间 |

### learning_records（学习记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| question_id | INTEGER | 题目ID（外键） |
| difficulty | REAL | FSRS难度参数 0-1 |
| stability | REAL | FSRS稳定性（天） |
| retrievability | REAL | 可提取性概率 |
| last_review | TIMESTAMP | 上次复习时间 |
| next_review | TIMESTAMP | 下次复习时间 |
| review_count | INTEGER | 复习次数 |
| mistake_count | INTEGER | 错误次数 |
| last_rating | INTEGER | 最近评分：1-4 |

### answer_history（答题历史表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| question_id | INTEGER | 题目ID（外键） |
| user_answer | TEXT | 用户答案 |
| is_correct | BOOLEAN | 是否正确 |
| rating | INTEGER | FSRS评分 |
| time_spent | INTEGER | 答题时长（秒） |
| created_at | TIMESTAMP | 答题时间 |

---

## 核心功能流程

### 1. 题库导入流程

```
上传docx → Agno Agent解析 → 提取题目 → 存入数据库
```

**Agno题库解析Agent职责：**
- 识别题目编号（"第 X 题"）
- 提取题目内容
- 解析选项（A/B/C/D）
- 匹配正确答案
- 关联解析内容

### 2. FSRS调度流程

```
用户请求刷题
    │
    ▼
FSRS推荐题目
├── 查找到期题目（next_review <= now）
├── 计算R值排序
└── 返回推荐列表
    │
    ▼
显示题目 → 用户作答 → 显示结果
    │
    ▼
FSRS评分（Again/Hard/Good/Easy）
    │
    ▼
更新学习记录
├── 更新S（稳定性）
├── 更新D（难度）
└── 设置next_review
```

### 3. FSRS参数说明

- **Stability (S)**: 记忆稳定性，表示遗忘概率降到90%需要的天数
- **Difficulty (D)**: 题目难度，0-1之间
- **Retrievability (R)**: 当前记忆可提取概率

**出题优先级：**
1. 已到期题目优先
2. 按R值从低到高排序
3. 新题目按科目平衡分配

---

## 前端页面设计

### 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Home | 首页Dashboard |
| `/practice` | Practice | 刷题页面 |
| `/bank` | QuestionBank | 题库管理 |
| `/statistics` | Statistics | 学习统计 |
| `/mistakes` | MistakeBook | 错题本 |

### 核心组件

**QuestionCard** - 题目展示组件
- 支持单选/多选/判断三种题型
- 显示题目内容和选项
- 提交答案功能

**AnswerResult** - 答题结果组件
- 显示正确/错误状态
- 展示正确答案和解析
- FSRS评分按钮

**StatsChart** - 统计图表组件
- 记忆曲线图
- 学习进度图
- 科目分布图

---

## 技术依赖

### 后端依赖

```txt
fastapi==0.109.0
uvicorn==0.27.0
sqlalchemy==2.0.25
python-docx==1.1.0
PyPDF2==3.0.1
fsrs==4.0.0
agno
pydantic==2.5.3
python-multipart==0.0.6
```

### 前端依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.0",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.300.0"
  }
}
```

---

## MVP实现计划

### Phase 1：基础架构（第1周）
- 项目初始化（前后端）
- 数据库模型和迁移
- 基础API框架

### Phase 2：核心功能（第2周）
- 题库解析Agent（Agno）
- 题目导入API
- 刷题界面（单选题）

### Phase 3：FSRS集成（第3周）
- FSRS调度逻辑
- 学习记录追踪
- 统计图表展示

### Phase 4：功能完善（迭代）
- 多选/判断题支持
- 错题本
- 学习助手Agent

---

## 成功标准

1. **题库导入**：能正确解析docx文件，提取率>95%
2. **FSRS调度**：用户学习效率提升30%以上
3. **用户体验**：页面响应时间<200ms
4. **稳定性**：支持1000+题目无性能问题