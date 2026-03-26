"""应用配置"""
import os

class Settings:
    # OpenAI 兼容 API 配置
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "http://192.168.100.99:8317/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "sk-jieyujing")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "deepseek-v3")

    # 文档目录
    DOC_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "doc")

settings = Settings()