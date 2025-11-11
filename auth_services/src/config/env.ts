import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ 
  override: true,
  debug: false 
});

const result = dotenv.config({ 
  path: path.resolve(process.cwd(), '.env') 
});

if (result.error) {
  throw new Error(`Failed to load .env file: ${result.error}`);
}

console.log('✅ Environment variables loaded successfully');
console.log('DB_HOST:', process.env.DB_HOST);

export {};