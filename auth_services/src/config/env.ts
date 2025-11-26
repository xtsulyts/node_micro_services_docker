import * as dotenv from 'dotenv';

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const result = dotenv.config();

  if (result.error && result.error.message.includes('ENOENT: no such file or directory')) {
    console.warn('⚠️ Advertencia: Archivo .env no encontrado en la raíz. Las variables deben estar cargadas de otra forma.');
  } else if (result.error) {
    console.warn('⚠️ Advertencia: Error al leer/parsear el archivo .env. Asegúrate de que el formato sea correcto.', result.error.message);
  } else {
    console.log('🔧 Modo desarrollo activado. Variables cargadas desde .env.');
  }
} else {
  console.log('🚀 Modo producción detectado. Usando variables de entorno del servidor (Render).');
}

export const envs = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  API_VERSION: process.env.API_VERSION,

  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_POOL_LIMIT: process.env.DB_POOL_LIMIT ? parseInt(process.env.DB_POOL_LIMIT) : 20,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS) : 12,

  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS
};

const requiredVariables = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

requiredVariables.forEach(key => {
  if (!envs[key as keyof typeof envs]) {
    console.error(`❌ ERROR DE CONFIGURACIÓN CRÍTICA: La variable de entorno ${key} no está definida.`);
    throw new Error(`Falta la variable de entorno crítica: ${key}. El servicio no puede arrancar.`);
  }
});