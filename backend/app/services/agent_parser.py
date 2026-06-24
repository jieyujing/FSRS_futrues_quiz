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
        # 如果文本太长，分割处理
        if len(text) > 5000:
            return self._parse_long_text(text)

        return self._parse_single(text)

    def _parse_single(self, text: str) -> List[Dict]:
        """解析单个文本块，包含指数退避重试机制"""
        import time
        prompt = self._build_prompt(text)
        max_retries = 5
        base_delay = 3.0  # 初始等待 3 秒

        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "你是一个专业的题库解析助手。请严格按照 JSON 格式返回结果。"},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=16000,
                    timeout=300.0  # 5分钟超时
                )

                content = response.choices[0].message.content
                questions = self._parse_response(content)
                if questions:
                    return questions
                else:
                    print(f"  ⚠️ 模型未返回有效 JSON，重试中 (第 {attempt + 1}/{max_retries} 次)...")
            except Exception as e:
                print(f"  ⚠️ Agent 调用异常: {e}")

            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                print(f"  ⏳ 将于 {delay} 秒后重试...")
                time.sleep(delay)

        print(f"  ❌ 达到最大重试次数，当前文本块解析失败")
        return []

    def _parse_long_text(self, text: str) -> List[Dict]:
        """分割长文本处理"""
        import time
        # 按题目编号分割 - 使用更简单直接的方式
        # 匹配: 数字. 或 数字、 开头的行
        parts = re.split(r'\n(?=\d+[\.\、]\s)', text)

        # 过滤空字符串
        parts = [p.strip() for p in parts if p.strip()]

        use_fixed_split = False
        if len(parts) < 2:
            # 如果分割失败，尝试按固定长度分割
            print(f"  按题目分割失败，按固定长度分割")
            use_fixed_split = True
            chunk_len = 4000  # 减小块大小避免超时
            parts = [text[i:i+chunk_len] for i in range(0, len(text), chunk_len)]

        print(f"  分割出 {len(parts)} 个部分")

        # 处理每个部分
        all_questions = []

        if use_fixed_split:
            # 固定长度分割，每个部分单独处理
            for i, part in enumerate(parts):
                print(f"  处理第 {i+1}/{len(parts)} 块...")
                try:
                    questions = self._parse_single(part)
                    all_questions.extend(questions)
                    print(f"    解析出 {len(questions)} 题")
                    time.sleep(2.0)  # 主动间隔，防止触发 OpenRouter 频控
                except Exception as e:
                    print(f"    块处理失败: {e}")
        else:
            # 按题目分割，每 10 题一组处理
            chunk_size = 10
            chunks = []
            current_chunk = []
            current_count = 0

            for part in parts:
                current_chunk.append(part)
                current_count += 1

                if current_count >= chunk_size:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = []
                    current_count = 0

            if current_chunk:
                chunks.append("\n".join(current_chunk))

            print(f"  文本已分割为 {len(chunks)} 块")

            for i, chunk in enumerate(chunks):
                print(f"  处理第 {i+1}/{len(chunks)} 块...")
                try:
                    questions = self._parse_single(chunk)
                    all_questions.extend(questions)
                    print(f"    解析出 {len(questions)} 题")
                    time.sleep(2.0)  # 主动间隔，防止触发 OpenRouter 频控
                except Exception as e:
                    print(f"    块处理失败: {e}")

        return all_questions

    def _build_prompt(self, text: str) -> str:
        """构建解析提示词"""
        return f"""请从以下文本中提取所有题目，返回 JSON 数组格式。

每道题目格式：
{{
  "question_type": "单选题|多选题|判断题|综合题",
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