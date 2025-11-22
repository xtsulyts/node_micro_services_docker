import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { AuthService } from '../../services/AuthServices';
import { UserService } from '../../services/UserServices';
import { JwtService } from '../../services/JwtServices';
import { CryptoService } from '../../services/CryptoServices';
import { UserModel } from '../../models/User';

/**
 * Configuración y exportación de rutas de autenticación v1
 * Centraliza todos los endpoints relacionados con autenticación
 */

// Inicialización de dependencias (Dependency Injection)
const userModel = new UserModel();
const cryptoService = new CryptoService();
const userService = new UserService(userModel, cryptoService);

// Configuración JWT desde variables de entorno
const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  defaultExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'social-crypto-app',
  audience: process.env.JWT_AUDIENCE || 'social-crypto-app-users'
};

const jwtService = new JwtService(jwtConfig);
const authService = new AuthService(userService, jwtService, cryptoService);
const authController = new AuthController(authService);

const router = Router();

/**
 * @route POST /api/v1/auth/register
 * @description Registra un nuevo usuario en el sistema
 * @access Public
 * @body {first_name, last_name, username, email, password, user_type, phone?, photo?}
 */
router.post('/register', (req, res) => {
  authController.register(req, res);
});

/**
 * @route POST /api/v1/auth/login  
 * @description Autentica un usuario existente
 * @access Public
 * @body {email, password}
 */
router.post('/login', (req, res) => {
  authController.login(req, res);
});

/**
 * @route POST /api/v1/auth/refresh-token
 * @description Renueva un token JWT expirado
 * @access Public (pero requiere token válido o recién expirado)
 * @body {token}
 */
router.post('/refresh-token', (req, res) => {
  authController.refreshToken(req, res);
});

/**
 * @route POST /api/v1/auth/verify-token
 * @description Verifica la validez de un token JWT
 * @access Public
 * @body {token}
 */
router.post('/verify-token', (req, res) => {
  authController.verifyToken(req, res);
});

/**
 * @route GET /api/v1/auth/password-policy
 * @description Obtiene los requisitos de seguridad para passwords
 * @access Public
 */
router.get('/password-policy', (req, res) => {
  authController.getPasswordPolicy(req, res);
});

/**
 * @route GET /api/v1/auth/health
 * @description Endpoint de salud para verificar que el servicio de auth está funcionando
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is healthy',
    timestamp: new Date().toISOString(),
    version: 'v1'
  });
});

/**
 * @route POST /api/v1/auth/request-password-reset
 * @description Solicita restablecimiento de contraseña (envía email con token)
 * @access Public
 * @body {email}
 */
router.post('/request-password-reset', (req, res) => {
  authController.requestPasswordReset(req, res);
});

/**
 * @route POST /api/v1/auth/validate-reset-token  
 * @description Valida si un token de restablecimiento es válido
 * @access Public
 * @body {token}
 */
router.post('/validate-reset-token', (req, res) => {
  authController.validateResetToken(req, res);
});

/**
 * @route POST /api/v1/auth/reset-password
 * @description Restablece la contraseña usando un token válido
 * @access Public
 * @body {token, newPassword}
 */
router.post('/reset-password', (req, res) => {
  authController.resetPassword(req, res);
});

export default router;