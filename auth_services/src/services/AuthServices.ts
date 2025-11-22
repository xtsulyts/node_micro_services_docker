import { UserService } from './UserServices';
import { JwtService } from './JwtServices';
import { CryptoService } from './CryptoServices';
import { enviarEmailRecuperacion } from './EmailServives';

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

interface PasswordResetResponse {
  success: boolean;
  email: string;
  resetToken?: string;
}

interface TokenValidationResponse {
  isValid: boolean;
  email?: string;
  userId?: number;
}

interface PasswordResetData {
  token: string;
  newPassword: string;
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

  async validateResetToken(token: string): Promise<TokenValidationResponse> {
  try {
    // Validar token en base de datos
    const tokenData = await this.userService.validateResetToken({ token });
    
    if (!tokenData || !tokenData.isValid) {
      return { isValid: false };
    }

    return {
      isValid: true,
      email: tokenData.email,
      userId: tokenData.userId
    };

  } catch (error) {
    console.error('Error en AuthService.validateResetToken:', error);
    return { isValid: false };
  }
  }

  async updatePassword(token: string, newPassword: string): Promise<void> {
  try {
    // Validar token primero
    const tokenValidation = await this.validateResetToken(token);
    if (!tokenValidation.isValid || !tokenValidation.userId) {
      throw new AuthError('INVALID_OR_EXPIRED_TOKEN');
    }

    // Validar fortaleza de nueva contraseña
    if (!this.cryptoService.isPasswordStrong(newPassword)) {
      throw new AuthError('WEAK_PASSWORD');
    }

    // Actualizar contraseña del usuario
    await this.userService.updatePassword({ 
  userId: tokenValidation.userId, 
  newPassword: newPassword 
  });
    
    // Invalidar token después de uso
    await this.userService.invalidateResetToken( {token});

  } catch (error) {
    console.error('Error en AuthService.updatePassword:', error);
    
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError('PASSWORD_UPDATE_FAILED');
  }
  }

async generateResetToken(email: string): Promise<string> {
  console.log('🔍 generateResetToken - Paso 1: Limpiando tokens expirados');
  await this.userService.cleanupExpiredTokens();

  console.log('🔍 generateResetToken - Paso 2: Buscando usuario por email');
  const user = await this.userService.findByEmail(email);
  if (!user) {
    console.log('🔍 generateResetToken - ❌ Usuario no encontrado');
    throw new AuthError('USER_NOT_FOUND');
  }

  console.log('🔍 generateResetToken - Paso 3: Generando token aleatorio');
  const resetToken = this.cryptoService.generateRandomToken();
  console.log('🔍 generateResetToken - Token generado:', resetToken);

  console.log('🔍 generateResetToken - Paso 4: Guardando token en BD');
  await this.userService.saveResetToken(user.user_id, resetToken);
  
  console.log('🔍 generateResetToken - Paso 5: Retornando token');
  return resetToken;
}

async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  console.log('🔍 Paso 1: Iniciando requestPasswordReset para:', email);
  
  try {
    console.log('🔍 Paso 2: Llamando generateResetToken...');
    const resetToken = await this.generateResetToken(email);
    console.log('🔍 Paso 3: Token generado:', resetToken);

    console.log('🔍 Paso 4: Llamando enviarEmailRecuperacion...');
    await enviarEmailRecuperacion(email, resetToken);
    console.log('🔍 Paso 5: Email enviado exitosamente');

    console.log('🔍 Paso 6: Retornando respuesta exitosa');
    return {
      success: true,
      email: email,
      resetToken: resetToken
    };

  } catch (error) {
    console.log('🔍 ❌ Error en requestPasswordReset:', error);
    
    console.log('🔍 Paso 7: Retornando respuesta de fallback');
    return {
      success: true,
      email: email
    };
  }
}
}