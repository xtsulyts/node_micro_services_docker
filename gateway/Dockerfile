FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY . .

# EXPONER EL PUERTO
EXPOSE 3000

# Ejecutar con ts-node (para ES Modules)
CMD ["npm", "run", "dev"]