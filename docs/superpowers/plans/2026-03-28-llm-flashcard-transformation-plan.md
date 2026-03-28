# LLM Flashcard Transformation Implementation Plan

## Phase 1: Database & Models (Day 1)
1. **Model Definition**: 
   - Create `backend/app/models/flashcard.py` with the `Flashcard` model.
   - Include fields: `id`, `question_id` (FK), `card_type` (Enum), `front_content`, `back_content`, `tags` (JSON), `difficulty` (Enum).
2. **Schema Updates**:
   - Create `backend/app/schemas/flashcard.py` for Pydantic models.
3. **Database Migration**:
   - Generate Alembic migration for the new `Flashcard` table.
   - Update `LearningRecord` to optionally point to `Flashcard.id` or create a new `FlashcardLearningRecord` model to track FSRS parameters for the new cards.

## Phase 2: LLM Processing Pipeline (Day 2-3)
1. **LLM Integration**:
   - Implement `backend/app/services/llm_card_service.py`.
   - Configure API integration (e.g., OpenAI or DeepSeek).
   - Design and test prompts to ensure robust JSON output format (`{"cards": [...]}`).
2. **Batch Processing**:
   - Create background task logic (e.g., using FastAPI `BackgroundTasks` or Celery) to batch-process `Question` rows into `Flashcard` rows without timing out.

## Phase 3: API Endpoints (Day 4)
1. **Card Management API**:
   - `backend/app/api/flashcards.py` endpoints for listing, fetching, and filtering flashcards.
   - Endpoint to trigger the batch processing.
2. **Analytics API**:
   - Endpoints to calculate error rates, review counts, and weaknesses grouped by the new `tags` field (e.g., `carry`, `term_structure`).

## Phase 4: Frontend Development (Day 5-6)
1. **Flashcard UI**:
   - Create new views (e.g., `Frontend/src/components/Flashcard.tsx`) tailored for quick Concept/Rule/Error study instead of standard multiple-choice UI.
2. **Analytics Dashboard**:
   - Implement UI for visualizing tag performance (weakness tracking).
3. **Strategy Mapping Integration**:
   - Add visual hints for rules mapping to specific strategies (e.g., tags triggering strategy icons).
