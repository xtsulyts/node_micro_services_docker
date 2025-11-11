// routes/index.ts
import { Router } from 'express';
import authenticationRoutes from '../v1/AuthenticationRoutes';

/**
 * Archivo centralizador de todas las rutas de la aplicación
 * Configura y exporta el router principal con todas las versiones de API
 */

const router = Router();

// Configuración del prefijo global para todas las rutas de API
const API_PREFIX = '/api';

// Montaje de todas las rutas v1 bajo el prefijo /api/v1
router.use(`${API_PREFIX}/v1/auth`, authenticationRoutes);

// Ruta de health check global de la API
router.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running successfully',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de bienvenida para la raíz de la API
router.get(API_PREFIX, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Under Tango API',
    version: '1.0.0',
    endpoints: {
      auth: `${API_PREFIX}/v1/auth`,
      health: `${API_PREFIX}/health`
    }
  });
});

// Manejo de rutas no encontradas usando (.*) 
router.all(`${API_PREFIX}/(.*)`, (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ENDPOINT_NOT_FOUND',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: [
      `${API_PREFIX}/v1/auth/register`,
      `${API_PREFIX}/v1/auth/login`,
      `${API_PREFIX}/v1/auth/refresh-token`,
      `${API_PREFIX}/v1/auth/verify-token`,
      `${API_PREFIX}/v1/auth/password-policy`,
      `${API_PREFIX}/health`
    ]
  });
});

export default router;