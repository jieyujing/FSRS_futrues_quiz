---
name: 题库导入功能设计
description: 批量导入 doc/pdf 文件，使用 Agent 解析题目并入库
type: project
created: 2026-03-24
status: approved
---

# 题库导入功能设计

## 概述

将 `doc/` 目录下的 docx 和 PDF 文件批量导入题库，使用 qwen3-coder-flash Agent 解析题目结构。

## 需求确认

| 需求项 | 决定 |
|--------|------|
| 文件格式 | docx + PDF 全部支持 |
| 元数据提取 | 从文件名自动提取（来源/科目/时间/套号） |
| 重复处理 | 跳过已存在的重复题目 |
| Agent 选择 | OpenAI 兼容 API（qwen3-coder-flash） |

## API 配置

```
Base URL: http://192.168.100.99:8317
API Key: sk-jieyujing
Model: qwen3-coder-flash
```

## 文件结构

```
backend/
├── app/
│   └── services/
│       └── question_importer.py    # 题库导入服务
├── scripts/
│   └── import_questions.py         # 导入命令脚本
```

## 数据流程

```
1. 扫描 doc/ 目录
   ├── 识别 .docx 和 .pdf 文件
   └── 提取文件名元数据（来源/科目/时间/套号）

2. 读取文件内容
   ├── docx: python-docx 提取文本
   └── pdf: PyPDF2 提取文本

3. Agent 解析题目
   ├── 调用 qwen3-coder-flash API
   ├── Prompt: 识别题目结构（题号/内容/选项/答案/解析）
   └── 返回结构化 JSON

4. 数据入库
   ├── 检查重复（题目内容 MD5 去重）
   ├── 跳过已存在题目
   └── 批量插入新题目

5. 输出报告
   └── 统计：成功/跳过/失败数量
```

## Agent 解析 Prompt

```
你是一个题库解析助手。请从以下文本中提取所有题目，返回 JSON 数组。

每道题目格式：
{
  "question_type": "单选|多选|判断",
  "question_number": 题号数字,
  "content": "题目内容",
  "options": {"A": "...", "B": "...", ...},
  "correct_answer": "正确答案",
  "explanation": "解析内容"
}

注意事项：
- 判断题选项用 {"A": "正确", "B": "错误"}，答案用 "A" 或 "B"
- 多选题答案合并如 "ABC"
- 解析取"名师解析"后的完整内容

待解析文本：
[文档内容]
```

## 文件名元数据提取规则

| 文件名示例 | 提取结果 |
|-----------|---------|
| `2023年5月LC押题 基础第一套解析.docx` | source=LC押题, subject=基础知识, date=2023-05, set=1 |
| `11月期货基础LK押题第一套解析.docx` | source=LK押题, subject=基础知识, date=2022-11, set=1 |
| `期货基础第1套.pdf` | source=通用, subject=基础知识, set=1 |

## 重复检测策略

使用题目内容 MD5 哈希去重：

```python
import hashlib

def get_content_hash(content: str) -> str:
    return hashlib.md5(content.strip().encode()).hexdigest()
```

## 成功标准

1. 正确解析 docx 和 PDF 文件
2. 题目提取准确率 > 95%
3. 重复题目正确跳过
4. 输出详细导入报告