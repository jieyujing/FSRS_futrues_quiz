from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, run_migrations
from app.models import Question, LearningRecord, AnswerHistory
from app.api import questions_router, practice_router, import_router, flashcards_router

# 创建应用
app = FastAPI(
    title="期货刷题助手 API",
    description="基于FSRS算法的期货从业考试刷题应用",
    version="0.1.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(questions_router)
app.include_router(practice_router)
app.include_router(import_router)
app.include_router(flashcards_router)


@app.on_event("startup")
async def startup():
    """启动时创建数据库表"""
    run_migrations()
    Base.metadata.create_all(bind=engine)


@app.get("/")
async def root():
    return {"message": "期货刷题助手 API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}