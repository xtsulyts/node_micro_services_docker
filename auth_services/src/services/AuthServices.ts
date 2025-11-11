import { UserService } from './UserServices';
import { JwtService } from './JwtServices';
import { CryptoService } from './CryptoServices';

// Interfaces para datos de autenticación
interface RegisterData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  user_type: number;
  phone?: string;
  photo?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    user_id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    user_type: number;
    phone?: string;
    photo?: string;
    active: boolean;
    created: Date;
  };
  token: string;
  expiresIn: number;
}

interface TokenRefreshResponse {
  token: string;
  expiresIn: number;
}

// Interface para errores de autenticación
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Servicio de autenticación que orquesta el flujo completo de auth
 * Combina UserService, JwtService y CryptoService para proporcionar
 * un sistema de autenticación robusto y seguro
 */
export class AuthService {
  private userService: UserService;
  private jwtService: JwtService;
  private cryptoService: CryptoService;

  constructor(
    userService: UserService,
    jwtService: JwtService,
    cryptoService: CryptoService
  ) {
    this.userService = userService;
    this.jwtService = jwtService;
    this.cryptoService = cryptoService;
  }

  /**
   * Registra un nuevo usuario en el sistema
   * Orquesta todo el proceso: validación, hashing, creación y generación de token
   * @param registerData - Datos del usuario a registrar
   * @returns Respuesta de autenticación con usuario y token
   */
  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      // Registrar usuario usando UserService (ya incluye validaciones y hashing)
      const user = await this.userService.register(registerData);

      // Generar payload para el token JWT
      const tokenPayload = {
        userId: user.user_id,
        email: user.email,
        userType: user.user_type
      };

      // Generar token JWT
      const tokenResult = await this.jwtService.generateToken(tokenPayload);

      // Retornar respuesta completa de autenticación
      return {
        user,
        token: tokenResult.token,
        expiresIn: tokenResult.expiresIn
      };

    } catch (error) {
      console.error('Error en AuthService.register:', error);
      
      // Convertir errores específicos a AuthError
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('REGISTRATION_FAILED');
    }
  }

  /**
   * Autentica un usuario existente en el sistema
   * Valida credenciales y genera token de acceso
   * @param loginData - Credenciales de login (email y password)
   * @returns Respuesta de autenticación con usuario y token
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      // Validar credenciales usando UserService
      const user = await this.userService.validateLoginCredentials(
        loginData.email, 
        loginData.password
      );

      if (!user) {
        throw new AuthError('INVALID_CREDENTIALS');
      }

      // Generar payload para el token JWT
      const tokenPayload = {
        userId: user.user_id,
        email: user.email,
        userType: user.user_type
      };

      // Generar token JWT
      const tokenResult = await this.jwtService.generateToken(tokenPayload);

      // Retornar respuesta completa de autenticación
      return {
        user,
        token: tokenResult.token,
        expiresIn: tokenResult.expiresIn
      };

    } catch (error) {
      console.error('Error en AuthService.login:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('LOGIN_FAILED');
    }
  }

  /**
   * Refresca un token JWT existente
   * @param token - Token actual a refrescar
   * @returns Nuevo token y información de expiración
   */
  async refreshToken(token: string): Promise<TokenRefreshResponse> {
    try {
      const tokenResult = await this.jwtService.refreshToken(token);
      
      return {
        token: tokenResult.token,
        expiresIn: tokenResult.expiresIn
      };

    } catch (error) {
      console.error('Error en AuthService.refreshToken:', error);
      throw new AuthError('TOKEN_REFRESH_FAILED');
    }
  }

  /**
   * Verifica la validez de un token JWT
   * @param token - Token a verificar
   * @returns Payload del token si es válido
   */
  async verifyToken(token: string) {
    try {
      const verificationResult = await this.jwtService.verifyToken(token);
      
      if (!verificationResult.isValid || !verificationResult.payload) {
        throw new AuthError('INVALID_TOKEN');
      }

      return verificationResult.payload;

    } catch (error) {
      console.error('Error en AuthService.verifyToken:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError('TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Obtiene información del usuario desde el token
   * sin necesidad de acceder a la base de datos
   * @param token - Token JWT
   * @returns Información básica del usuario desde el token
   */
  async getUserFromToken(token: string) {
    try {
      const payload = await this.verifyToken(token);
      
      // Obtener información adicional del usuario si es necesario
      // const user = await this.userService.findById(payload.userId);
      
      return {
        userId: payload.userId,
        email: payload.email,
        userType: payload.userType
      };

    } catch (error) {
      console.error('Error en AuthService.getUserFromToken:', error);
      throw new AuthError('FAILED_TO_GET_USER_FROM_TOKEN');
    }
  }

  /**
   * Valida que un usuario tenga los permisos requeridos
   * @param token - Token JWT del usuario
   * @param requiredUserType - Tipo de usuario requerido
   * @returns true si el usuario tiene los permisos necesarios
   */
  async validateUserPermissions(token: string, requiredUserType: number): Promise<boolean> {
    try {
      const payload = await this.verifyToken(token);
      return payload.userType >= requiredUserType;

    } catch (error) {
      console.error('Error en AuthService.validateUserPermissions:', error);
      return false;
    }
  }

  /**
   * Obtiene la política de passwords para mostrar en el frontend
   * @returns Requisitos de seguridad para passwords
   */
  getPasswordPolicy() {
    return this.cryptoService.getPasswordPolicy();
  }
}