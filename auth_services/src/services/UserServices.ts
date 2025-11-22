import { UserModel, User, CreateUserData } from '../models/User';
import { CryptoService } from './CryptoServices';

// Interface para los datos de registro
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

// Interface para respuesta de usuario (sin datos sensibles)
interface UserResponse {
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
}

// Interface para errores de negocio
class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

interface ResetTokenData {
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
}

interface TokenValidationResult {
  isValid: boolean;
  userId?: number;
  email?: string;
}

interface PasswordUpdateResult {
  success: boolean;
  userId: number;
}

interface TokenValidationParams {
  token: string;
}

interface UserPasswordUpdateParams {
  userId: number;
  newPassword: string;
}

interface TokenInvalidationParams {
  token: string;
}

export class UserService {
  private userModel: UserModel;
  private cryptoService: CryptoService;

  constructor(userModel: UserModel, cryptoService: CryptoService) {
    this.userModel = userModel;
    this.cryptoService = cryptoService;
  }

  /**
   * Registra un nuevo usuario en el sistema
   * Aplica todas las validaciones de negocio antes de crear el usuario
   * @param registerData - Datos del usuario a registrar
   * @returns Usuario creado sin información sensible
   */
  async register(registerData: RegisterData): Promise<UserResponse> {
    try {
      // Validaciones de negocio
      await this.validateRegistrationData(registerData);

      // Hash seguro del password usando CryptoService
      const hashedPassword = await this.cryptoService.hashPassword(registerData.password);

      const userData: CreateUserData = {
        ...registerData,
        password: hashedPassword // Password ahora hasheado seguramente
      };

      // Crear usuario en la base de datos
      const newUser = await this.userModel.create(userData);
      
      // Transformar respuesta (excluir datos sensibles)
      return this.transformUserResponse(newUser);

    } catch (error) {
      // Relanzar errores de negocio, manejar otros
      if (error instanceof BusinessError) {
        throw error;
      }
      console.error('Error en UserService.register:', error);
      throw new BusinessError('ERROR_DURING_REGISTRATION');
    }
  }

  /**
   * Valida las credenciales de login de un usuario
   * @param email - Email del usuario
   * @param password - Password sin hashear
   * @returns Usuario válido o null si las credenciales son incorrectas
   */
  async validateLoginCredentials(email: string, password: string): Promise<UserResponse | null> {
    try {
      // Buscar usuario por email
      const user = await this.userModel.findByEmail(email);
      
      if (!user) {
        return null;
      }

      // Comparación segura de passwords usando CryptoService
      const passwordMatch = await this.cryptoService.comparePasswords(password, user.password);
      
      if (!passwordMatch.isValid) {
        return null;
      }

      // Verificar que el usuario esté activo
      if (!user.active) {
        throw new BusinessError('USER_ACCOUNT_INACTIVE');
      }

      return this.transformUserResponse(user);

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      console.error('Error en UserService.validateLoginCredentials:', error);
      throw new BusinessError('ERROR_DURING_LOGIN_VALIDATION');
    }
  }

  /**
   * Valida los datos de registro según las reglas de negocio
   * @param registerData - Datos a validar
   */
  private async validateRegistrationData(registerData: RegisterData): Promise<void> {
    // Validar formato de email
    if (!this.isValidEmail(registerData.email)) {
      throw new BusinessError('INVALID_EMAIL_FORMAT');
    }

    // Validar fortaleza del password usando CryptoService
    if (!this.cryptoService.validatePasswordStrength(registerData.password)) {
      throw new BusinessError('WEAK_PASSWORD');
    }

    // Verificar que el email no esté en uso
    const existingUserByEmail = await this.userModel.findByEmail(registerData.email);
    if (existingUserByEmail) {
      throw new BusinessError('EMAIL_ALREADY_EXISTS');
    }

    // Verificar que el username no esté en uso
    const existingUserByUsername = await this.userModel.findByUsername(registerData.username);
    if (existingUserByUsername) {
      throw new BusinessError('USERNAME_ALREADY_EXISTS');
    }
  }

  /**
   * Valida formato de email básico
   * @param email - Email a validar
   * @returns true si el formato es válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Transforma el usuario de la base de datos a respuesta de API
   * Excluye información sensible como passwords
   * @param user - Usuario de la base de datos
   * @returns Usuario listo para enviar como respuesta
   */
  private transformUserResponse(user: User): UserResponse {
    return {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      phone: user.phone,
      photo: user.photo,
      active: user.active,
      created: user.created
    };
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
  try {
    const user = await this.userModel.findByEmail(email);
    return user ? this.transformUserResponse(user) : null;
  } catch (error) {
    console.error('Error en UserService.findByEmail:', error);
    throw new BusinessError('ERROR_FINDING_USER_BY_EMAIL');
  }
  }

  async saveResetToken(userId: number, token: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await this.userModel.saveResetToken({ userId, token, expiresAt });
  } catch (error) {
    console.error('Error en UserService.saveResetToken:', error);
    throw new BusinessError('FAILED_TO_SAVE_RESET_TOKEN');
  }
  }

  async cleanupExpiredTokens(): Promise<void> {
  try {
    await this.userModel.cleanupExpiredTokens();
  } catch (error) {
    console.error('Error en UserService.cleanupExpiredTokens:', error);
    // No throw, es una operación de mantenimiento
  }
  }

  async validateResetToken(params: TokenValidationParams): Promise<TokenValidationResult> {
    try {
      const tokenData = await this.userModel.findResetToken(params.token);
      
      if (!tokenData) {
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: tokenData.userId,
        email: tokenData.email
      };

    } catch (error) {
      console.error('Error en UserService.validateResetToken:', error);
      return { isValid: false };
    }
  }

  async updatePassword(params: UserPasswordUpdateParams): Promise<PasswordUpdateResult> {
  try {
    // Hashear la nueva contraseña
    const hashedPassword = await this.cryptoService.hashPassword(params.newPassword);
    
    // Actualizar en la base de datos
    await this.userModel.updatePassword({
      userId: params.userId,
      hashedPassword: hashedPassword
    });
    
    return {
      success: true,
      userId: params.userId
    };

  } catch (error) {
    console.error('Error en UserService.updatePassword:', error);
    throw new BusinessError('PASSWORD_UPDATE_FAILED');
  }
  }

  async invalidateResetToken(params: TokenInvalidationParams): Promise<void> {
  try {
    await this.userModel.markTokenAsUsed(params.token);
  } catch (error) {
    console.error('Error en UserService.invalidateResetToken:', error);
    throw new BusinessError('FAILED_TO_INVALIDATE_TOKEN');
  }
}
}