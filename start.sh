#!/bin/bash

# 期货刷题助手 - 一键启动脚本
# 关闭脚本时自动关闭所有服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 存储 PID
BACKEND_PID=""
FRONTEND_PID=""

# 清理函数 - 关闭所有服务
cleanup() {
    echo ""
    echo -e "${YELLOW}正在关闭所有服务...${NC}"

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${BLUE}关闭 Backend (PID: $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${BLUE}关闭 Frontend (PID: $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi

    echo -e "${GREEN}所有服务已关闭${NC}"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM EXIT

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    期货刷题助手 - 启动中...${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Python 虚拟环境
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${RED}错误: Backend 虚拟环境不存在${NC}"
    echo -e "${YELLOW}请先运行: cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# 检查 node_modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}错误: Frontend 依赖未安装${NC}"
    echo -e "${YELLOW}请先运行: cd frontend && npm install${NC}"
    exit 1
fi

# 启动 Backend
echo -e "${BLUE}启动 Backend 服务...${NC}"
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}Backend 已启动 (PID: $BACKEND_PID)${NC}"
echo -e "${BLUE}API 地址: http://localhost:8000${NC}"

# 等待 Backend 启动
sleep 2

# 启动 Frontend
echo -e "${BLUE}启动 Frontend 服务...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend 已启动 (PID: $FRONTEND_PID)${NC}"
echo -e "${BLUE}访问地址: http://localhost:5173${NC}"

# 等待 Frontend 启动
sleep 2

# 自动打开浏览器
echo -e "${BLUE}正在打开浏览器...${NC}"
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "http://localhost:5173" 2>/dev/null &
elif command -v gnome-open &> /dev/null; then
    gnome-open "http://localhost:5173" 2>/dev/null &
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    所有服务已启动成功!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}按 Ctrl+C 关闭所有服务${NC}"
echo ""

# 等待任意子进程结束
wait