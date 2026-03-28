# LLM Flashcard Transformation Design

## Objective
Transform the traditional question bank into highly compressed FSRS-friendly flashcards (Concept, Rule, Error) using an LLM. This enables structured storage, weakness tracking via tags, and strategy mapping.

## Architecture & Data Flow

### 1. Database Model (1-to-N Mapping)
Instead of modifying the existing `Question` model directly, we will create a new `Flashcard` model to support a 1-to-N relationship. A single complex question can be broken down into multiple discrete concepts or rules.

**`Flashcard` Table:**
- `id`: Integer (Primary Key)
- `question_id`: Integer (Foreign Key to `questions.id`)
- `card_type`: String (Enum: `Concept`, `Rule`, `Error`)
- `front_content`: Text (The abstracted question/prompt)
- `back_content`: Text (The abstracted answer/explanation)
- `tags`: JSON (Array of strings like `["carry", "term_structure"]`)
- `difficulty`: String (Enum: `Easy`, `Medium`, `Hard` - matching Easy/Medium/Hard logic to Concept/Rule/Error as requested)
- `created_at`: DateTime

*Note: The existing FSRS `LearningRecord` will need to be adapted or duplicated to track reviews against `Flashcard.id` instead of (or alongside) `Question.id`.*

### 2. LLM Processing Pipeline
The core of this feature is an LLM service that digests a raw question and outputs structured JSON.
- **Trigger**: Batch processing task (processes all or selected questions).
- **Prompt Logic**: 
  - Input: Question Content, Options, Correct Answer, Explanation (and User Answer if Error type).
  - Output format:
    ```json
    {
      "cards": [
        {
          "type": "Rule",
          "front_content": "...",
          "back_content": "...",
          "tags": ["carry", "term_structure"],
          "difficulty": "Medium"
        }
      ]
    }
    ```

### 3. API Endpoints
- `POST /api/flashcards/generate/batch`: Trigger background task to process questions into flashcards.
- `GET /api/flashcards`: List flashcards, filter by tags, types, or difficulty.
- `GET /api/flashcards/analytics`: Aggregate statistics (e.g., error rates by tag) to identify weakness areas.

### 4. Frontend Integration
- **Flashcard View**: A new study interface focused on the `Flashcard` model, integrating directly with the existing FSRS logic.
- **Analytics Dashboard**: Visual representation of weaknesses based on tags (e.g., radar charts or bar graphs showing performance in "volatility" vs "arbitrage").
- **Strategy Mapping**: UI hints or badges that map specific tags/rules to market strategies.

## Success Criteria
- [ ] LLM can successfully parse complex questions into multiple discrete FSRS cards.
- [ ] Users can study using the new Flashcard format.
- [ ] Tag-based analytics accurately reflect user weaknesses.
