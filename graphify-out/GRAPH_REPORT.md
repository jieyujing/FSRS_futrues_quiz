# Graph Report - .  (2026-06-22)

## Corpus Check
- Corpus is ~24,252 words - fits in a single context window. You may not need a graph.

## Summary
- 369 nodes · 520 edges · 42 communities (26 shown, 16 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Flashcard API & DB|Flashcard API & DB]]
- [[_COMMUNITY_Practice Session API|Practice Session API]]
- [[_COMMUNITY_Frontend UI Components|Frontend UI Components]]
- [[_COMMUNITY_App TypeScript Config|App TypeScript Config]]
- [[_COMMUNITY_Node TypeScript Config|Node TypeScript Config]]
- [[_COMMUNITY_FSRS Algorithm & Models|FSRS Algorithm & Models]]
- [[_COMMUNITY_FSRS Service Layer|FSRS Service Layer]]
- [[_COMMUNITY_Question Import Pipeline|Question Import Pipeline]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Frontend Dev Dependencies|Frontend Dev Dependencies]]
- [[_COMMUNITY_Question CRUD API|Question CRUD API]]
- [[_COMMUNITY_LLM Flashcard Service|LLM Flashcard Service]]
- [[_COMMUNITY_UI & Flashcard Specs|UI & Flashcard Specs]]
- [[_COMMUNITY_Import & Parser API|Import & Parser API]]
- [[_COMMUNITY_Agent Parser Service|Agent Parser Service]]
- [[_COMMUNITY_Import Design & Config|Import Design & Config]]
- [[_COMMUNITY_Quiz App Implementation|Quiz App Implementation]]
- [[_COMMUNITY_Metadata Extraction|Metadata Extraction]]
- [[_COMMUNITY_Agent Parsing Design|Agent Parsing Design]]
- [[_COMMUNITY_Flashcard Component|Flashcard Component]]
- [[_COMMUNITY_Vite React Template|Vite React Template]]
- [[_COMMUNITY_Root TSConfig|Root TSConfig]]
- [[_COMMUNITY_Default Bank Persistence|Default Bank Persistence]]
- [[_COMMUNITY_Docker Entrypoint|Docker Entrypoint]]
- [[_COMMUNITY_Docker Services|Docker Services]]
- [[_COMMUNITY_HTML Entry Point|HTML Entry Point]]
- [[_COMMUNITY_Favicon & Vite Logo|Favicon & Vite Logo]]
- [[_COMMUNITY_Database Indexing|Database Indexing]]
- [[_COMMUNITY_SQL Aggregation Optimization|SQL Aggregation Optimization]]
- [[_COMMUNITY_Docker Deployment|Docker Deployment]]
- [[_COMMUNITY_Memory Tracking|Memory Tracking]]
- [[_COMMUNITY_Dashboard Stats|Dashboard Stats]]
- [[_COMMUNITY_Questions API Impl|Questions API Impl]]
- [[_COMMUNITY_Icons Sprite|Icons Sprite]]
- [[_COMMUNITY_Hero Image|Hero Image]]
- [[_COMMUNITY_React Logo|React Logo]]
- [[_COMMUNITY_N+1 Query Problem|N+1 Query Problem]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `QuestionImporter` - 13 edges
4. `FSRSService` - 12 edges
5. `Session` - 11 edges
6. `AgentParser` - 9 edges
7. `LLMCardService` - 9 edges
8. `AnswerSubmit` - 8 edges
9. `AnswerHistory` - 8 edges
10. `Question` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Futures Regulation Question Bank (Set 5)` --conceptually_related_to--> `LLM Processing Pipeline`  [INFERRED]
  doc/期货法规第5套.pdf → docs/superpowers/specs/2026-03-28-llm-flashcard-transformation-design.md
- `OpenAI Python SDK Dependency` --conceptually_related_to--> `AgentParser Service`  [INFERRED]
  backend/requirements.txt → docs/plans/2026-03-24-question-import-implementation.md
- `fsrs-python Dependency` --conceptually_related_to--> `FSRSService`  [INFERRED]
  backend/requirements.txt → docs/plans/2026-03-24-quiz-app-implementation.md
- `FSRS Algorithm` --conceptually_related_to--> `FSRS Scheduling Flow`  [INFERRED]
  README.md → docs/plans/2026-03-24-quiz-app-design.md
- `Balanced Question Distribution` --conceptually_related_to--> `Practice API Router`  [INFERRED]
  README.md → docs/plans/2026-03-24-quiz-app-implementation.md

## Import Cycles
- 1-file cycle: `backend/app/services/fsrs_service.py -> backend/app/services/fsrs_service.py`

## Hyperedges (group relationships)
- **FSRS Core Parameters (S, D, R)** — plans_quiz_app_design_stability, plans_quiz_app_design_difficulty, plans_quiz_app_design_retrievability [EXTRACTED 1.00]
- **Question Import Pipeline (Read -> Parse -> Deduplicate -> Store)** — plans_question_import_impl_filereader, plans_question_import_impl_agentparser, plans_question_import_impl_metadataextractor, plans_question_import_impl_questionimporter [EXTRACTED 1.00]
- **Dashboard Performance Optimization (Indexing + Aggregation)** — superpowers_plans_database_indexing, superpowers_plans_sql_aggregation_optimization, superpowers_n_plus_1_query_problem [EXTRACTED 1.00]
- **Flashcard Study Flow: Question Bank to LLM Pipeline to Study Interface** — doc_5_flashcard_transformation_question_bank, specs_2026_03_28_llm_flashcard_transformation_llm_pipeline, specs_2026_03_28_llm_flashcard_transformation_flashcard_model, specs_2026_03_28_llm_flashcard_transformation_flashcard_view [INFERRED 0.85]
- **Default Subject Experience: localStorage to Subject Card to Practice Page** — specs_2026_03_26_ui_overhaul_default_bank_localstorage, specs_2026_03_26_ui_overhaul_default_bank_subject_card, specs_2026_03_26_ui_overhaul_default_bank_practice_tsx [INFERRED 0.85]

## Communities (42 total, 16 thin omitted)

### Community 0 - "Flashcard API & DB"
Cohesion: 0.11
Nodes (23): get_flashcard(), get_next_flashcards(), get_tag_analytics(), list_flashcards(), rate_flashcard(), get_db(), Session, Base (+15 more)

### Community 1 - "Practice Session API"
Cohesion: 0.17
Nodes (29): AnswerSubmit, check_answer_correct(), get_dashboard(), get_mistake_questions(), get_next_questions(), get_session_summary(), mark_question_ignored(), record_answer() (+21 more)

### Community 2 - "Frontend UI Components"
Cohesion: 0.08
Nodes (15): AnswerResultProps, PracticeSummaryProps, SummaryData, Option, QuestionCardProps, DashboardStats, PracticeState, Question (+7 more)

### Community 3 - "App TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 4 - "Node TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 5 - "FSRS Algorithm & Models"
Cohesion: 0.11
Nodes (20): Balanced Question Distribution, FSRS Algorithm, AnswerHistory Data Model, Difficulty (D) Parameter, FSRS Scheduling Flow, LearningRecord Data Model, Question Data Model, Retrievability (R) Parameter (+12 more)

### Community 6 - "FSRS Service Layer"
Cohesion: 0.16
Nodes (8): Question, Session, LearningRecord, Rating, FSRSService, 答题后更新 FSRS 参数          Args:             db: 数据库会话             question_id: 题目 I, 获取推荐复习的题目，强制保持题型比例平衡          策略：         对于每种目标题型（单选/多选/判断）：         1. 优先获取已到期, 计算可提取性概率 R         R = (1 + t/(9*S))^(-1)，t 为距上次复习的天数

### Community 7 - "Question Import Pipeline"
Cohesion: 0.19
Nodes (5): main(), QuestionImporter, 批量导入题库脚本  用法：     cd backend     python scripts/import_questions.py, FileReader, 根据文件扩展名读取文件          Returns:             (文本内容, 是否成功)

### Community 8 - "Frontend Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, axios, lucide-react, react, react-dom, react-router-dom, recharts, name (+8 more)

### Community 9 - "Frontend Dev Dependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+9 more)

### Community 10 - "Question CRUD API"
Cohesion: 0.23
Nodes (13): create_question(), delete_question(), get_question(), get_stats(), list_questions(), Session, QuestionCreate, Config (+5 more)

### Community 11 - "LLM Flashcard Service"
Cohesion: 0.19
Nodes (8): Question, Session, batch_convert(), 批量将所有题目转换为 FSRS 记忆卡片  用法：     cd backend     python scripts/batch_convert_flashc, LLMCardService, 批量处理题目转换          Returns:             成功生成的卡片总数, 使用 LLM 将原始题目转换为 FSRS 记忆卡片, 将单道题目转换为多张 FSRS 卡片          Args:             question: Question 模型实例          R

### Community 12 - "UI & Flashcard Specs"
Cohesion: 0.15
Nodes (13): Futures Regulation Question Bank (Set 5), Answer Feedback FX, Card Hover Effect (translateY -4px with glow), Subject Card UI Component, 1-to-N Rationale: Complex Questions Yield Multiple Concepts, Card Type Enum (Concept/Rule/Error), Flashcard API Endpoints, Flashcard Model (1-to-N Mapping) (+5 more)

### Community 13 - "Import & Parser API"
Cohesion: 0.24
Nodes (7): delete_by_source(), get_content_hash(), import_docx(), list_sources(), Session, QuestionParser, UploadFile

### Community 14 - "Agent Parser Service"
Cohesion: 0.27
Nodes (3): Settings, AgentParser, 使用 Agent 解析文本中的题目          Args:             text: 文档文本内容          Returns:

### Community 15 - "Import Design & Config"
Cohesion: 0.18
Nodes (11): Filename Metadata Extraction, MD5 Content Hash Deduplication, qwen3-coder-flash LLM Model, AgentParser Service, FileReader Service, MetadataExtractor Service, QuestionImporter Script, Settings Config Class (+3 more)

### Community 16 - "Quiz App Implementation"
Cohesion: 0.22
Nodes (11): AnswerResult React Component, Frontend API Service (axios), Home Dashboard Page, Practice Page, QuestionBank Page, QuestionCard React Component, Rating Enum (FSRS 1-4), Answer Feedback Animation (+3 more)

### Community 17 - "Metadata Extraction"
Cohesion: 0.50
Nodes (3): FileMetadata, MetadataExtractor, 匹配：2023年5月LC押题 基础第一套解析

### Community 18 - "Agent Parsing Design"
Cohesion: 0.40
Nodes (5): Question Bank Management, Agent-Based Question Parsing, Agno Agent for Question Parsing, Import API Router, QuestionParser (Regex-based)

### Community 20 - "Vite React Template"
Cohesion: 0.67
Nodes (3): React + TypeScript + Vite Template, @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC)

### Community 22 - "Default Bank Persistence"
Cohesion: 0.67
Nodes (3): Default Bank Persistence, localStorage (f_practice_default_subject), Practice.tsx Page

## Knowledge Gaps
- **142 isolated node(s):** `UploadFile`, `QuestionCreate`, `Settings`, `Config`, `Config` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `QuestionImporter` connect `Question Import Pipeline` to `Metadata Extraction`, `Agent Parser Service`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `FSRSService` connect `FSRS Service Layer` to `Flashcard API & DB`, `Practice Session API`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `LLMCardService` connect `LLM Flashcard Service` to `Flashcard API & DB`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `QuestionImporter` (e.g. with `AgentParser` and `FileReader`) actually correct?**
  _`QuestionImporter` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UploadFile`, `QuestionCreate`, `Settings` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Flashcard API & DB` be split into smaller, more focused modules?**
  _Cohesion score 0.10510510510510511 - nodes in this community are weakly interconnected._
- **Should `Frontend UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._