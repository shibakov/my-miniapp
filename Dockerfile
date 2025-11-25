# ---------- Stage 1: Build React/Vite ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем остальной код
COPY . .

# Сборка Vite-приложения
RUN npm run build



# ---------- Stage 2: Nginx static host ----------
FROM nginx:alpine

# Удаляем дефолтный конфиг nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Копируем наш конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный фронт
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
