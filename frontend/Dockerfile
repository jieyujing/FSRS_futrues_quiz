# 第一阶段：编译构建
FROM node:20-alpine AS build-stage

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# 第二阶段：使用 Nginx 托管静态文件
FROM nginx:stable-alpine AS production-stage

# 复制构建后的文件到 Nginx 目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
