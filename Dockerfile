# ---------- Stage 1: Build React/Vite ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Stage 2: Nginx static host ----------
FROM nginx:alpine

# Railway requires exposing dynamic port
ENV PORT=8080

# Copy custom config that uses ${PORT}
COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
