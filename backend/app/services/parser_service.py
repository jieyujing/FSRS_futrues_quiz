from docx import Document
from typing import List, Dict, Optional
import re


class QuestionParser:
    """题库解析服务"""

    def parse_docx(self, file_path: str) -> List[Dict]:
        """
        解析docx文件，提取题目
        """
        doc = Document(file_path)
        questions = []

        current_question = None
        current_content = []
        current_options = {}

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # 检测题目编号
            question_match = re.match(r"第\s*(\d+)\s*题", text)
            if question_match:
                # 保存上一题
                if current_question:
                    current_question["content"] = "\n".join(current_content)
                    current_question["options"] = current_options
                    questions.append(current_question)

                # 开始新题
                current_question = {
                    "question_number": int(question_match.group(1)),
                    "content": "",
                    "options": {},
                    "correct_answer": "",
                    "explanation": ""
                }
                current_content = []
                current_options = {}
                continue

            # 检测选项
            option_match = re.match(r"([A-D])\.(.+)", text)
            if option_match and current_question:
                option_key = option_match.group(1)
                option_value = option_match.group(2).strip()
                current_options[option_key] = option_value
                continue

            # 检测正确答案
            answer_match = re.match(r"正确答案[：:]\s*([A-D]+)", text)
            if answer_match and current_question:
                current_question["correct_answer"] = answer_match.group(1)
                continue

            # 检测解析
            if "名师解析" in text or "解析" in text:
                continue

            # 普通文本作为题目内容
            if current_question and not current_question.get("correct_answer"):
                current_content.append(text)
            elif current_question and current_question.get("correct_answer"):
                current_question["explanation"] += text + "\n"

        # 保存最后一题
        if current_question:
            current_question["content"] = "\n".join(current_content)
            current_question["options"] = current_options
            questions.append(current_question)

        return questions

    def parse_docx_with_answers(
        self,
        question_file: str,
        answer_file: str
    ) -> List[Dict]:
        """分别解析题目文件和解析文件，合并结果"""
        questions = self.parse_docx(question_file)
        answers = self.parse_docx(answer_file)

        for q in questions:
            for a in answers:
                if q["question_number"] == a["question_number"]:
                    q["correct_answer"] = a.get("correct_answer", "")
                    q["explanation"] = a.get("explanation", "")
                    break

        return questions