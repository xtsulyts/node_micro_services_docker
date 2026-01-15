FROM node:18-alpine

WORKDIR /usr/src/app

# Instalar tsx para ES modules
RUN npm install -g tsx

COPY package*.json ./
RUN npm ci

COPY . .

# Compilar TypeScript
RUN npm run build

EXPOSE 3000

# Ejecutar la versión compilada (JavaScript)
CMD ["node", "dist/server.js"]