"""LLM 题目转卡片服务"""
import json
import re
from typing import List, Dict, Optional
from openai import OpenAI
from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.question import Question
from ..models.flashcard import Flashcard, CardType, DifficultyLevel


class LLMCardService:
    """使用 LLM 将原始题目转换为 FSRS 记忆卡片"""

    def __init__(self):
        self.client = OpenAI(
            base_url=settings.OPENAI_BASE_URL,
            api_key=settings.OPENAI_API_KEY
        )
        self.model = settings.OPENAI_MODEL

    def transform_question(self, question: Question) -> List[Dict]:
        """
        将单道题目转换为多张 FSRS 卡片

        Args:
            question: Question 模型实例

        Returns:
            生成的卡片列表 (Dict 格式)
        """
        prompt = self._build_transform_prompt(question)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的期货交易员和记忆力专家。你的任务是将传统的刷题库转换为更适合 FSRS 记忆系统的结构化知识卡片。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            return self._parse_response(content)

        except Exception as e:
            print(f"LLM 转换卡片失败 (Question ID: {question.id}): {e}")
            return []

    def _build_transform_prompt(self, question: Question) -> str:
        """构建转换提示词"""
        options_str = json.dumps(question.options, ensure_ascii=False) if question.options else "无"

        return f"""请将以下题目转化为 1-3 张高度压缩的 FSRS 记忆卡片。

卡片类型定义：
1. Concept (概念卡): 提取题目涉及的基础概念、术语定义。难度设为 "Easy"。
2. Rule (规则/公式卡): 提取计算公式、合约规则、法律条文。难度设为 "Medium"。
3. Error (决策抽象/易错卡): 抽象出题目背后的决策逻辑或陷阱，用于防止同类错误。难度设为 "Hard"。

输入题目详情：
- 题型: {question.question_type}
- 内容: {question.content}
- 选项: {options_str}
- 正确答案: {question.correct_answer}
- 解析: {question.explanation or "无"}

要求：
1. **信息压缩**：不要直接复制题目，要提取出最核心的考点。
2. **决策抽象**：特别是 Rule 和 Error 类型，要写成“如果...那么...”或“关键判断点是...”的形式。
3. **标签系统**：给出 1-3 个专业标签（如: carry, gamma, margin, term_structure, arbitrage）。
4. **JSON 格式**：返回格式如下：
{{
  "cards": [
    {{
      "card_type": "Concept|Rule|Error",
      "front_content": "卡片正面内容",
      "back_content": "卡片背面内容",
      "tags": ["tag1", "tag2"],
      "difficulty": "Easy|Medium|Hard"
    }}
  ]
}}

请开始转换："""

    def _parse_response(self, content: str) -> List[Dict]:
        """解析 LLM 返回的 JSON"""
        try:
            data = json.loads(content)
            return data.get("cards", [])
        except json.JSONDecodeError:
            # 备选方案：正则匹配
            json_match = re.search(r'\{\s*"cards".*\}', content, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    return data.get("cards", [])
                except:
                    pass
            print(f"LLM 返回格式解析失败: {content[:500]}")
            return []

    def process_batch(self, db: Session, question_ids: List[int]) -> int:
        """
        批量处理题目转换

        Returns:
            成功生成的卡片总数
        """
        questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
        total_created = 0

        for q in questions:
            # 检查是否已存在卡片 (可选，如果想去重)
            # if q.flashcards: continue

            cards_data = self.transform_question(q)
            for card_item in cards_data:
                new_card = Flashcard(
                    question_id=q.id,
                    card_type=card_item.get("card_type", CardType.CONCEPT),
                    front_content=card_item.get("front_content", ""),
                    back_content=card_item.get("back_content", ""),
                    tags=card_item.get("tags", []),
                    difficulty=card_item.get("difficulty", DifficultyLevel.EASY)
                )
                db.add(new_card)
                total_created += 1

            db.commit()

        return total_created
