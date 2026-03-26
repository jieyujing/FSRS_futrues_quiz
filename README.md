# 期货刷题助手 / Futures Exam Practice Assistant

[简体中文](#简体中文) | [English](#english)

---

## 简体中文

基于 FSRS 算法的期货从业资格考试刷题应用，支持智能复习调度和学习进度追踪。

### 功能特点

- **智能复习算法**: 基于 FSRS (Free Spaced Repetition Scheduler) 算法，科学安排复习计划
- **均衡题型分布**: 智能调度算法确保练习中单选 (45%)、多选 (35%)、判断 (20%) 比例均衡，避免单一题型刷屏
- **全题型支持**: 完美支持单选题、多选题（支持多项切换与自动排序提交）以及判断题
- **题库管理**: 支持批量导入题目，按科目分类管理，支持断点续传与去重
- **学习统计**: 实时追踪学习进度，可视化展示答题数据与记忆稳定性
- **现代界面**: 基于 React 19 构建的现代化、响应式用户界面

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + TypeScript + Lucide Icons |
| 后端 | FastAPI + SQLAlchemy + SQLite |
| 算法 | FSRS 间隔重复算法 (fsrs-python) |
| 样式 | Vanilla CSS / TailwindCSS |

### 快速开始

#### 环境要求

- Python 3.12+
- Node.js 18+
- npm 或 pnpm
- Docker & Docker Compose (可选)

#### 安装步骤 (常规方式)

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd LKLC期货押题
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   # .venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   ```

3. **安装前端依赖**
   ```bash
   cd ../frontend
   npm install
   ```

4. **一键启动**
   ```bash
   cd ..
   ./start.sh
   ```

   或分别启动：

   ```bash
   # 终端1 - 启动后端
   cd backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8005

   # 终端2 - 启动前端
   cd frontend
   npm run dev
   ```

#### Docker 部署 (推荐方式)

1. **一键构建并启动**
   ```bash
   docker-compose up -d --build
   ```

2. **初始化数据 (如需从 doc 目录导入题目)**
   ```bash
   docker exec -it lklc-backend python scripts/import_questions.py
   ```

3. **访问应用**
   - 前端地址: http://localhost (80 端口)
   - API 文档: http://localhost:8005/docs

### 题型说明

- **单选题**: 标准 A/B/C/D 选项。
- **多选题**: 支持点击多个选项，系统会自动按字母顺序排序后提交。
- **判断题**: 界面提供“正确/错误”专用按钮。
- **不定项**: 处理逻辑与多选题一致。

---

## English

A futures industry qualification exam practice application based on the FSRS algorithm, featuring intelligent review scheduling and learning progress tracking.

### Features

- **Smart Review Algorithm**: Powered by FSRS (Free Spaced Repetition Scheduler) for scientifically optimized review schedules.
- **Balanced Question Distribution**: Intelligent scheduling ensures a balanced mix of Single-choice (45%), Multiple-choice (35%), and True/False (20%) questions during practice sessions.
- **Full Question Type Support**: Comprehensive support for Single-choice, Multiple-choice (with multi-toggle and auto-sorting), and True/False questions.
- **Question Bank Management**: Batch import from docx/pdf, subject-based organization, with duplicate detection and resume support.
- **Learning Statistics**: Real-time progress tracking with visualized data on mastery and memory stability.
- **Modern Interface**: Responsive UI built with React 19 and modern design principles.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + TypeScript + Lucide Icons |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Algorithm | FSRS Spaced Repetition (fsrs-python) |
| Styling | Vanilla CSS / TailwindCSS |

### Quick Start

#### Requirements

- Python 3.12+
- Node.js 18+
- npm or pnpm
- Docker & Docker Compose (Optional)

#### Installation (Regular Method)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LKLC期货押题
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   # .venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **One-click start**
   ```bash
   cd ..
   ./start.sh
   ```

   Or start separately:

   ```bash
   # Terminal 1 - Start backend
   cd backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8005

   # Terminal 2 - Start frontend
   cd frontend
   npm run dev
   ```

#### Docker Deployment (Recommended)

1. **One-click build and start**
   ```bash
   docker-compose up -d --build
   ```

2. **Initialize data (if you need to import questions from doc directory)**
   ```bash
   docker exec -it lklc-backend python scripts/import_questions.py
   ```

3. **Access the application**
   - Frontend: http://localhost (Port 80)
   - API Docs: http://localhost:8005/docs

### Question Types

- **Single Choice**: Standard A/B/C/D selection.
- **Multiple Choice**: Support for multiple selections; answers are automatically sorted alphabetically before submission.
- **True/False**: Dedicated "True/False" buttons for specialized interaction.
- **Indefinite Choice**: Handled with the same logic as Multiple Choice.

---

## License

MIT License
