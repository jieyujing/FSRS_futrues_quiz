"""
批量将所有题目转换为 FSRS 记忆卡片

用法：
    cd backend
    python scripts/batch_convert_flashcards.py
"""
import os
import sys
import time
from typing import List

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.question import Question
from app.models.flashcard import Flashcard
from app.services.llm_card_service import LLMCardService

def batch_convert():
    db = SessionLocal()
    llm_service = LLMCardService()
    
    print("=" * 60)
    print("🚀 启动批量题目转卡片任务 (LLM 驱动)")
    print("=" * 60)

    # 1. 查找尚未转换的题目
    # 使用子查询找到已经有卡片的题目 ID
    existing_q_ids = db.query(Flashcard.question_id).distinct().subquery()
    
    query = db.query(Question).filter(~Question.id.in_(existing_q_ids))
    total_to_process = query.count()
    
    print(f"📊 发现 {total_to_process} 道待转换题目。")
    
    if total_to_process == 0:
        print("✅ 所有题目已转换完成。")
        return

    # 2. 分批处理
    batch_size = 10
    processed_count = 0
    cards_created_total = 0
    start_time = time.time()

    # 重新获取待处理列表 (避免 offset 在删除/增加时的复杂性，我们直接按 ID 排序取前 N 个)
    while True:
        # 每次取一小批，确保实时看到进度
        current_batch_questions = db.query(Question).filter(
            ~Question.id.in_(db.query(Flashcard.question_id).distinct().subquery())
        ).limit(batch_size).all()
        
        if not current_batch_questions:
            break
            
        for q in current_batch_questions:
            try:
                # 转换题目
                cards_data = llm_service.transform_question(q)
                
                from app.models.flashcard import CardType, DifficultyLevel
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
                    cards_created_total += 1
                
                processed_count += 1
                
                # 每处理一个题目打印一次进度，避免长时间无响应感
                elapsed = time.time() - start_time
                avg_time = elapsed / processed_count if processed_count > 0 else 0
                remaining = (total_to_process - processed_count) * avg_time
                
                print(f"  [{processed_count}/{total_to_process}] ID:{q.id} -> 生成 {len(cards_data)} 张卡片 | 累计: {cards_created_total} | 预估剩余: {remaining/60:.1f}min")
                
                # 立即提交，防止任务中断丢失进度
                db.commit()
                
            except Exception as e:
                print(f"  ❌ 处理 ID:{q.id} 失败: {e}")
                db.rollback()
                # 失败后稍作等待，可能是 API 限制
                time.sleep(2)

    print("\n" + "=" * 60)
    print("🎉 批量转换完成！")
    print(f"总处理题目: {processed_count}")
    print(f"生成卡片总数: {cards_created_total}")
    print(f"总耗时: {(time.time() - start_time)/60:.1f} 分钟")
    print("=" * 60)
    
    db.close()

if __name__ == "__main__":
    try:
        batch_convert()
    except KeyboardInterrupt:
        print("\n🛑 任务被用户中断。已保存当前进度。")
        sys.exit(0)
