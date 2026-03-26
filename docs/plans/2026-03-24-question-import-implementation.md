# 题库导入功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 批量导入 doc/pdf 文件，使用 qwen3-coder-flash Agent 智能解析题目并入库

**Architecture:** 创建 Agent 解析服务替代现有正则解析，添加批量导入脚本，支持重复检测和元数据提取

**Tech Stack:** Python, OpenAI SDK (兼容模式), python-docx, PyPDF2, SQLAlchemy

---

## Task 1: 添加 OpenAI 依赖和配置

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/app/core/config.py`

**Step 1: 更新依赖**

在 `backend/requirements.txt` 末尾添加：

```
openai>=1.0.0
```

**Step 2: 创建配置文件**

创建 `backend/app/core/config.py`:

```python
"""应用配置"""
import os

class Settings:
    # OpenAI 兼容 API 配置
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "http://192.168.100.99:8317/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "sk-jieyujing")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "qwen3-coder-flash")

    # 文档目录
    DOC_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "doc")

settings = Settings()
```

**Step 3: 创建 core 目录**

```bash
mkdir -p backend/app/core
touch backend/app/core/__init__.py
```

**Step 4: Commit**

```bash
git add backend/requirements.txt backend/app/core/
git commit -m "feat: add OpenAI config for agent parsing"
```

---

## Task 2: 创建 Agent 解析服务

**Files:**
- Create: `backend/app/services/agent_parser.py`

**Step 1: 创建 Agent 解析服务**

创建 `backend/app/services/agent_parser.py`:

```python
"""Agent 智能解析服务"""
import json
import re
from typing import List, Dict, Optional
from openai import OpenAI
from ..core.config import settings


class AgentParser:
    """使用 LLM 智能解析题目"""

    def __init__(self):
        self.client = OpenAI(
            base_url=settings.OPENAI_BASE_URL,
            api_key=settings.OPENAI_API_KEY
        )
        self.model = settings.OPENAI_MODEL

    def parse_questions(self, text: str) -> List[Dict]:
        """
        使用 Agent 解析文本中的题目

        Args:
            text: 文档文本内容

        Returns:
            题目列表，每题包含:
            - question_type: 单选/多选/判断
            - question_number: 题号
            - content: 题目内容
            - options: 选项字典
            - correct_answer: 正确答案
            - explanation: 解析
        """
        prompt = self._build_prompt(text)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的题库解析助手。请严格按照 JSON 格式返回结果。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=16000
            )

            content = response.choices[0].message.content
            return self._parse_response(content)

        except Exception as e:
            print(f"Agent 解析失败: {e}")
            return []

    def _build_prompt(self, text: str) -> str:
        """构建解析提示词"""
        return f"""请从以下文本中提取所有题目，返回 JSON 数组格式。

每道题目格式：
{{
  "question_type": "单选|多选|判断",
  "question_number": 题号数字,
  "content": "题目内容",
  "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
  "correct_answer": "正确答案（单选如A，多选如ABC，判断用A表示正确B表示错误）",
  "explanation": "解析内容"
}}

注意事项：
1. 判断题选项固定为 {{"A": "正确", "B": "错误"}}
2. 多选题答案合并如 "ABC"
3. 解析取"名师解析"或"解析"后的完整内容
4. 只返回 JSON 数组，不要其他内容

待解析文本：
{text}"""

    def _parse_response(self, content: str) -> List[Dict]:
        """解析 Agent 返回的 JSON"""
        # 尝试提取 JSON 块
        json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # 尝试直接解析
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            print(f"JSON 解析失败，原始内容: {content[:500]}")
            return []
```

**Step 2: Commit**

```bash
git add backend/app/services/agent_parser.py
git commit -m "feat: add agent parser service with qwen3-coder-flash"
```

---

## Task 3: 创建文件解析器（docx + PDF）

**Files:**
- Create: `backend/app/services/file_reader.py`

**Step 1: 创建文件读取服务**

创建 `backend/app/services/file_reader.py`:

```python
"""文件读取服务"""
import os
from typing import Tuple, Optional
from docx import Document
from PyPDF2 import PdfReader


class FileReader:
    """读取 docx 和 PDF 文件内容"""

    @staticmethod
    def read_docx(file_path: str) -> str:
        """读取 docx 文件文本"""
        doc = Document(file_path)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        return "\n".join(paragraphs)

    @staticmethod
    def read_pdf(file_path: str) -> str:
        """读取 PDF 文件文本"""
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        return "\n".join(text_parts)

    @classmethod
    def read_file(cls, file_path: str) -> Tuple[str, bool]:
        """
        根据文件扩展名读取文件

        Returns:
            (文本内容, 是否成功)
        """
        ext = os.path.splitext(file_path)[1].lower()

        try:
            if ext == ".docx":
                return cls.read_docx(file_path), True
            elif ext == ".pdf":
                return cls.read_pdf(file_path), True
            else:
                return f"不支持的文件格式: {ext}", False
        except Exception as e:
            return f"读取失败: {str(e)}", False
```

**Step 2: Commit**

```bash
git add backend/app/services/file_reader.py
git commit -m "feat: add file reader for docx and pdf"
```

---

## Task 4: 创建元数据提取器

**Files:**
- Create: `backend/app/services/metadata_extractor.py`

**Step 1: 创建元数据提取服务**

创建 `backend/app/services/metadata_extractor.py`:

```python
"""文件名元数据提取"""
import re
from typing import Dict
from dataclasses import dataclass


@dataclass
class FileMetadata:
    """文件元数据"""
    source: str          # 来源：LC押题、LK押题
    subject: str         # 科目：基础知识、法律法规
    date: str            # 时间：2023-05、2022-11
    set_number: int      # 套号：1、2、3...
    original_name: str   # 原始文件名


class MetadataExtractor:
    """从文件名提取元数据"""

    # 匹配模式
    PATTERNS = [
        # 2023年5月LC押题 基础第一套解析.docx
        r"(\d{4})年(\d{1,2})月(LC|LK)押题\s*(基础|法规).*第([一二三四五六七八九十]+)套",
        # 11月期货基础LK押题第一套解析.docx
        r"(\d{1,2})月期货(基础|法规)(LK|LC)押题.*第([一二三四五六七八九十]+)套",
        # 期货基础第1套.pdf
        r"期货(基础|法规)第(\d+)套",
    ]

    CHINESE_NUM_MAP = {
        "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
        "六": 6, "七": 7, "八": 8, "九": 9, "十": 10
    }

    SUBJECT_MAP = {
        "基础": "基础知识",
        "法规": "法律法规",
        "法律": "法律法规"
    }

    @classmethod
    def extract(cls, filename: str) -> FileMetadata:
        """从文件名提取元数据"""
        name = filename.replace(".docx", "").replace(".pdf", "")

        # 尝试匹配各种模式
        result = cls._try_pattern_1(name) or cls._try_pattern_2(name) or cls._try_default(name)

        result.original_name = filename
        return result

    @classmethod
    def _try_pattern_1(cls, name: str) -> FileMetadata:
        """匹配：2023年5月LC押题 基础第一套解析"""
        match = re.search(
            r"(\d{4})年(\d{1,2})月(LC|LK)押题\s*(基础|法规).*第([一二三四五六七八九十]+)套",
            name
        )
        if match:
            return FileMetadata(
                source=f"{match.group(3)}押题",
                subject=cls.SUBJECT_MAP.get(match.group(4), match.group(4)),
                date=f"{match.group(1)}-{match.group(2).zfill(2)}",
                set_number=cls.CHINESE_NUM_MAP.get(match.group(5), 1),
                original_name=""
            )
        return None

    @classmethod
    def _try_pattern_2(cls, name: str) -> FileMetadata:
        """匹配：11月期货基础LK押题第一套解析"""
        match = re.search(
            r"(\d{1,2})月期货(基础|法规)(LK|LC)押题.*第([一二三四五六七八九十]+)套",
            name
        )
        if match:
            return FileMetadata(
                source=f"{match.group(3)}押题",
                subject=cls.SUBJECT_MAP.get(match.group(2), match.group(2)),
                date=f"2022-{match.group(1).zfill(2)}",  # 默认2022年
                set_number=cls.CHINESE_NUM_MAP.get(match.group(4), 1),
                original_name=""
            )
        return None

    @classmethod
    def _try_default(cls, name: str) -> FileMetadata:
        """默认提取"""
        # 提取科目
        subject = "基础知识"
        if "法规" in name or "法律" in name:
            subject = "法律法规"

        # 提取套号
        set_number = 1
        num_match = re.search(r"第([一二三四五六七八九十\d]+)套", name)
        if num_match:
            num_str = num_match.group(1)
            set_number = cls.CHINESE_NUM_MAP.get(num_str, int(num_str) if num_str.isdigit() else 1)

        # 提取来源
        source = "通用"
        if "LC" in name:
            source = "LC押题"
        elif "LK" in name:
            source = "LK押题"

        return FileMetadata(
            source=source,
            subject=subject,
            date="",
            set_number=set_number,
            original_name=""
        )
```

**Step 2: Commit**

```bash
git add backend/app/services/metadata_extractor.py
git commit -m "feat: add metadata extractor from filename"
```

---

## Task 5: 创建批量导入脚本

**Files:**
- Create: `backend/scripts/import_questions.py`

**Step 1: 创建导入脚本**

创建 `backend/scripts/import_questions.py`:

```python
"""
批量导入题库脚本

用法：
    cd backend
    python scripts/import_questions.py
"""
import os
import sys
import hashlib
from typing import List, Dict

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Question
from app.services.file_reader import FileReader
from app.services.agent_parser import AgentParser
from app.services.metadata_extractor import MetadataExtractor

# 创建数据库表
Base.metadata.create_all(bind=engine)


class QuestionImporter:
    """题库导入器"""

    def __init__(self, doc_dir: str):
        self.doc_dir = doc_dir
        self.reader = FileReader()
        self.parser = AgentParser()
        self.db = SessionLocal()

        # 统计
        self.stats = {
            "total_files": 0,
            "success_files": 0,
            "total_questions": 0,
            "added_questions": 0,
            "skipped_questions": 0,
            "failed_files": []
        }

    def get_content_hash(self, content: str) -> str:
        """计算题目内容哈希"""
        return hashlib.md5(content.strip().encode()).hexdigest()

    def is_duplicate(self, content: str) -> bool:
        """检查题目是否已存在"""
        content_hash = self.get_content_hash(content)
        existing = self.db.query(Question).filter(
            Question.content == content
        ).first()
        return existing is not None

    def scan_files(self) -> List[str]:
        """扫描目录中的 docx 和 pdf 文件"""
        files = []
        for f in os.listdir(self.doc_dir):
            if f.endswith((".docx", ".pdf")) and not f.startswith("~"):
                files.append(os.path.join(self.doc_dir, f))
        return sorted(files)

    def import_file(self, file_path: str) -> Dict:
        """导入单个文件"""
        filename = os.path.basename(file_path)
        print(f"\n处理文件: {filename}")

        # 1. 提取元数据
        metadata = MetadataExtractor.extract(filename)
        print(f"  元数据: 来源={metadata.source}, 科目={metadata.subject}, 套号={metadata.set_number}")

        # 2. 读取文件内容
        text, success = self.reader.read_file(file_path)
        if not success:
            print(f"  ❌ 读取失败: {text}")
            return {"success": False, "error": text}

        print(f"  文本长度: {len(text)} 字符")

        # 3. Agent 解析题目
        print(f"  正在调用 Agent 解析...")
        questions = self.parser.parse_questions(text)

        if not questions:
            print(f"  ⚠️ 未解析出题目")
            return {"success": False, "error": "未解析出题目"}

        print(f"  解析出 {len(questions)} 道题目")

        # 4. 入库
        added = 0
        skipped = 0
        source_name = f"{metadata.source}_{metadata.subject}_第{metadata.set_number}套"

        for q in questions:
            content = q.get("content", "").strip()
            if not content:
                continue

            # 检查重复
            if self.is_duplicate(content):
                skipped += 1
                continue

            # 创建题目
            db_question = Question(
                subject=metadata.subject,
                source=source_name,
                question_type=q.get("question_type", "单选"),
                question_number=q.get("question_number"),
                content=content,
                options=q.get("options", {}),
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", "")
            )
            self.db.add(db_question)
            added += 1

        self.db.commit()
        print(f"  ✅ 成功导入 {added} 题，跳过 {skipped} 题（重复）")

        return {
            "success": True,
            "parsed": len(questions),
            "added": added,
            "skipped": skipped
        }

    def run(self):
        """执行批量导入"""
        print("=" * 60)
        print("题库批量导入")
        print("=" * 60)

        files = self.scan_files()
        self.stats["total_files"] = len(files)
        print(f"发现 {len(files)} 个文件待处理")

        for file_path in files:
            result = self.import_file(file_path)

            if result["success"]:
                self.stats["success_files"] += 1
                self.stats["total_questions"] += result["parsed"]
                self.stats["added_questions"] += result["added"]
                self.stats["skipped_questions"] += result["skipped"]
            else:
                self.stats["failed_files"].append(os.path.basename(file_path))

        # 打印报告
        self.print_report()

    def print_report(self):
        """打印导入报告"""
        print("\n" + "=" * 60)
        print("导入报告")
        print("=" * 60)
        print(f"总文件数: {self.stats['total_files']}")
        print(f"成功文件: {self.stats['success_files']}")
        print(f"失败文件: {len(self.stats['failed_files'])}")
        if self.stats['failed_files']:
            for f in self.stats['failed_files']:
                print(f"  - {f}")
        print(f"解析题目: {self.stats['total_questions']}")
        print(f"新增题目: {self.stats['added_questions']}")
        print(f"跳过题目: {self.stats['skipped_questions']}（重复）")
        print("=" * 60)

    def close(self):
        """关闭数据库连接"""
        self.db.close()


def main():
    # 获取 doc 目录路径
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    doc_dir = os.path.join(os.path.dirname(backend_dir), "doc")

    if not os.path.exists(doc_dir):
        print(f"错误: doc 目录不存在: {doc_dir}")
        sys.exit(1)

    importer = QuestionImporter(doc_dir)
    try:
        importer.run()
    finally:
        importer.close()


if __name__ == "__main__":
    main()
```

**Step 2: 创建 scripts 目录**

```bash
mkdir -p backend/scripts
touch backend/scripts/__init__.py
```

**Step 3: Commit**

```bash
git add backend/scripts/
git commit -m "feat: add batch import script with agent parsing"
```

---

## Task 6: 运行导入并验证

**Files:**
- None

**Step 1: 安装依赖**

```bash
cd backend
pip install -r requirements.txt
```

**Step 2: 运行导入脚本**

```bash
cd backend
python scripts/import_questions.py
```

**Step 3: 验证导入结果**

```bash
# 检查数据库中的题目数量
sqlite3 backend/data/quiz.db "SELECT COUNT(*) FROM questions;"

# 查看按来源统计
sqlite3 backend/data/quiz.db "SELECT source, COUNT(*) FROM questions GROUP BY source;"

# 查看按科目统计
sqlite3 backend/data/quiz.db "SELECT subject, COUNT(*) FROM questions GROUP BY subject;"
```

---

## 总结

### 新增文件
- `backend/app/core/__init__.py`
- `backend/app/core/config.py`
- `backend/app/services/agent_parser.py`
- `backend/app/services/file_reader.py`
- `backend/app/services/metadata_extractor.py`
- `backend/scripts/__init__.py`
- `backend/scripts/import_questions.py`

### 修改文件
- `backend/requirements.txt` - 添加 openai 依赖

### 执行命令

```bash
cd backend
pip install -r requirements.txt
python scripts/import_questions.py
```