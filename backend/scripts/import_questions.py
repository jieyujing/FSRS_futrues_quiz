"""
批量导入题库脚本

用法：
    cd backend
    python scripts/import_questions.py
"""
import os
import sys
import hashlib
import re
import shutil
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
        self.imported_dir = os.path.join(doc_dir, "已导入")
        os.makedirs(self.imported_dir, exist_ok=True)
        
        self.reader = FileReader()
        self.parser = AgentParser()
        self.db = SessionLocal()

        # 加载已有题目哈希用于内存查重
        try:
            existing_hashes = self.db.query(Question.content_hash).all()
            self.seen_hashes = {h[0] for h in existing_hashes if h[0]}
        except Exception:
            self.seen_hashes = set()

        # 加载已导入来源用于文件级断点续传跳过
        self.existing_sources = set()
        try:
            for q in self.db.query(Question.source).distinct():
                if q[0]: self.existing_sources.add(q[0])
        except Exception:
            pass

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
        """计算题目内容哈希，清洗无关字符"""
        normalized = re.sub(r'\s+', '', content)
        return hashlib.md5(normalized.encode()).hexdigest()

    def is_duplicate(self, content: str) -> bool:
        """检查题目是否已存在（O(1)内存匹配）"""
        content_hash = self.get_content_hash(content)
        if content_hash in self.seen_hashes:
            return True
        self.seen_hashes.add(content_hash)
        return False

    def scan_files(self) -> List[str]:
        """扫描目录中的待处理文件"""
        files = []
        for f in os.listdir(self.doc_dir):
            if f.endswith((".docx", ".pdf")) and not f.startswith("~"):
                file_path = os.path.join(self.doc_dir, f)
                
                # 检查数据库是否已导入该文件的对应来源 (合并自 import_remaining)
                metadata = MetadataExtractor.extract(f)
                source_name = f"{metadata.source}_{metadata.subject}_第{metadata.set_number}套"
                
                if source_name in self.existing_sources:
                    dest_path = os.path.join(self.imported_dir, f)
                    try:
                        shutil.move(file_path, dest_path)
                        print(f"⏩ {f} 在历史库中已有记录，自动归档并替您省下单次大模型解析费！")
                    except Exception:
                        pass
                    continue
                    
                files.append(file_path)
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
                content_hash=self.get_content_hash(content),
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
                
                # 成功导入后，移动文件到归档目录
                filename = os.path.basename(file_path)
                dest_path = os.path.join(self.imported_dir, filename)
                try:
                    shutil.move(file_path, dest_path)
                    print(f"  📦 文件已断点续传归档至: 已导入/{filename}")
                except Exception as e:
                    print(f"  ⚠️ 归档文件移动失败: {e}")
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
        
        try:
            total = self.db.query(Question).count()
            print(f"\n当前数据库总题目数: {total}")
        except Exception:
            pass
            
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