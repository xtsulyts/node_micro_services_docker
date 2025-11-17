import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  PORT: process.env.PORT || 3000,
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3001'
};