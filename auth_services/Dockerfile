
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./


RUN npm ci && npm install --save-dev typescript

COPY . .


RUN npm run build


EXPOSE 3001


CMD ["npm", "run", "dev"]
