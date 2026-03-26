from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os
import tempfile
from ..database import get_db
from ..models import Question
from ..services.parser_service import QuestionParser

router = APIRouter(prefix="/import", tags=["题库导入"])
parser = QuestionParser()


import hashlib

def get_content_hash(content: str) -> str:
    """计算题目内容的MD5哈希"""
    return hashlib.md5(content.encode("utf-8")).hexdigest()

@router.post("/docx")
async def import_docx(
    file: UploadFile = File(...),
    subject: str = "基础知识",
    db: Session = Depends(get_db)
):
    """导入单个docx文件"""
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="只支持docx文件")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        questions = parser.parse_docx(tmp_path)
        source = file.filename.replace(".docx", "")
        added_count = 0

        # 获取现有题目的哈希，用于去重
        existing_hashes = {h[0] for h in db.query(Question.content_hash).all()}

        for q in questions:
            if not q.get("content") or not q.get("options"):
                continue

            content_hash = get_content_hash(q["content"])
            if content_hash in existing_hashes:
                continue

            db_question = Question(
                subject=subject,
                source=source,
                question_type="单选",
                question_number=q.get("question_number"),
                content=q["content"],
                content_hash=content_hash,
                options=q["options"],
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", "")
            )
            db.add(db_question)
            existing_hashes.add(content_hash)
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