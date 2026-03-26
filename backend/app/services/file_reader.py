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