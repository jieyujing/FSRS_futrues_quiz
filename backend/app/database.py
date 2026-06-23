from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
import sqlite3

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "quiz.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite需要
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_migrations():
    """检测并执行数据库模式升级"""
    if not os.path.exists(DB_PATH):
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # 1. 升级 learning_records 表
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_records'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(learning_records)")
            columns = [col[1] for col in cursor.fetchall()]
            if "flashcard_id" not in columns:
                print("检测到旧版数据库结构，正在执行 learning_records 表升级...")
                
                # 重命名旧表
                cursor.execute("ALTER TABLE learning_records RENAME TO learning_records_old")
                
                # 创建新表（允许 question_id 为空，增加 flashcard_id）
                cursor.execute("""
                    CREATE TABLE learning_records (
                        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                        question_id INTEGER UNIQUE,
                        flashcard_id INTEGER UNIQUE,
                        difficulty FLOAT DEFAULT 0.3,
                        stability FLOAT DEFAULT 1.0,
                        retrievability FLOAT,
                        last_review DATETIME,
                        next_review DATETIME,
                        review_count INTEGER DEFAULT 0,
                        mistake_count INTEGER DEFAULT 0,
                        last_rating INTEGER,
                        is_ignored BOOLEAN DEFAULT 0,
                        FOREIGN KEY(question_id) REFERENCES questions(id),
                        FOREIGN KEY(flashcard_id) REFERENCES flashcards(id)
                    )
                """)
                
                # 迁移数据
                cursor.execute("""
                    INSERT INTO learning_records (
                        id, question_id, difficulty, stability, retrievability,
                        last_review, next_review, review_count, mistake_count, last_rating, is_ignored
                    )
                    SELECT 
                        id, question_id, difficulty, stability, retrievability,
                        last_review, next_review, review_count, mistake_count, last_rating, is_ignored
                    FROM learning_records_old
                """)
                
                # 删除旧表
                cursor.execute("DROP TABLE learning_records_old")
                print("learning_records 表升级完成。")

        # 2. 升级 answer_history 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_history'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(answer_history)")
            columns = [col[1] for col in cursor.fetchall()]
            if "flashcard_id" not in columns:
                print("检测到旧版数据库结构，正在执行 answer_history 表升级...")
                
                # 重命名旧表
                cursor.execute("ALTER TABLE answer_history RENAME TO answer_history_old")
                
                # 创建新表
                cursor.execute("""
                    CREATE TABLE answer_history (
                        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                        question_id INTEGER,
                        flashcard_id INTEGER,
                        user_answer VARCHAR(50),
                        is_correct BOOLEAN,
                        rating INTEGER,
                        time_spent INTEGER,
                        created_at DATETIME,
                        FOREIGN KEY(question_id) REFERENCES questions(id),
                        FOREIGN KEY(flashcard_id) REFERENCES flashcards(id)
                    )
                """)
                
                # 迁移数据
                cursor.execute("""
                    INSERT INTO answer_history (
                        id, question_id, user_answer, is_correct, rating, time_spent, created_at
                    )
                    SELECT 
                        id, question_id, user_answer, is_correct, rating, time_spent, created_at
                    FROM answer_history_old
                """)
                
                # 删除旧表
                cursor.execute("DROP TABLE answer_history_old")
                print("answer_history 表升级完成。")

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"数据库模式升级失败: {e}")
        raise e
    finally:
        conn.close()


def get_db():
    """依赖注入：获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()