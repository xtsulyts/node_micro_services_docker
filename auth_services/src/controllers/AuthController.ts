import { Request, Response } from 'express';
import { AuthService } from '../services/AuthServices';
import { enviarEmailRecuperacion } from '../services/EmailServives';

// Interfaces para requests tipados
interface RegisterRequest extends Request {
  body: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    user_type: number;
    phone?: string;
    photo?: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface RecoverPassword {
  body: {
    email: string;
  };
}

interface RefreshTokenRequest extends Request {
  body: {
    token: string;
  };
}

interface VerifyTokenRequest extends Request {
  body: {
    token: string;
  };
}

// Interface para respuestas estandarizadas
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Interface para errores del controller
interface ControllerError {
  message: string;
  code?: string;
}

interface RequestPasswordResetRequest extends Request {
  body: {
    email: string;
  };
}

interface ValidateResetTokenRequest extends Request {
  body: {
    token: string;
  };
}

interface ResetPasswordRequest extends Request {
  body: {
    token: string;
    newPassword: string;
    confirmPassword?: string; // Opcional para validación en frontend
  };
}

interface PasswordResetResponse {
  success: boolean;
  email: string;
  resetToken?: string;
}

/**
 * Controlador para manejar todas las operaciones HTTP de autenticación
 * Se encarga de recibir requests, validar datos básicos y enviar responses
 */
export class AuthController { 
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Maneja el registro de nuevos usuarios
   * @param req - Request HTTP con datos de registro
   * @param res - Response HTTP
   */
  async register(req: RegisterRequest, res: Response): Promise<void> {
    try {
      // Validación básica de datos requeridos
      if (!this.validateRegisterData(req.body)) {
        this.sendErrorResponse(res, 400, 'MISSING_REQUIRED_FIELDS');
        return;
      }

      // Procesar registro a través del AuthService
      const authResponse = await this.authService.register(req.body);

      // Enviar respuesta exitosa
      this.sendSuccessResponse(res, 201, {
        message: 'USER_REGISTERED_SUCCESSFULLY',
        data: authResponse
      });

    } catch (error) {
      // Type assertion para el error
      const err = error as ControllerError;
      
      console.error('Error en AuthController.register:', err.message);
      
      // Manejar diferentes tipos de errores
      if (err.message.includes('EMAIL_ALREADY_EXISTS')) {
        this.sendErrorResponse(res, 409, 'EMAIL_ALREADY_EXISTS');
      } else if (err.message.includes('USERNAME_ALREADY_EXISTS')) {
        this.sendErrorResponse(res, 409, 'USERNAME_ALREADY_EXISTS');
      } else if (err.message.includes('WEAK_PASSWORD')) {
        this.sendErrorResponse(res, 400, 'WEAK_PASSWORD');
      } else if (err.message.includes('INVALID_EMAIL_FORMAT')) {
        this.sendErrorResponse(res, 400, 'INVALID_EMAIL_FORMAT');
      } else {
        this.sendErrorResponse(res, 500, 'REGISTRATION_FAILED');
      }
    }
  }

  /**
   * Maneja el login de usuarios existentes
   * @param req - Request HTTP con credenciales
   * @param res - Response HTTP
   */
  async login(req: LoginRequest, res: Response): Promise<void> {
    try {
      // Validación básica de credenciales
      if (!req.body.email || !req.body.password) {
        this.sendErrorResponse(res, 400, 'EMAIL_AND_PASSWORD_REQUIRED');
        return;
      }

      // Procesar login a través del AuthService
      const authResponse = await this.authService.login(req.body);

      // Enviar respuesta exitosa
      this.sendSuccessResponse(res, 200, {
        message: 'LOGIN_SUCCESSFUL',
        data: authResponse
      });

    } catch (error) {
      // Type assertion para el error
      const err = error as ControllerError;
      
      console.error('Error en AuthController.login:', err.message);
      
      // Manejar errores específicos de login
      if (err.message.includes('INVALID_CREDENTIALS')) {
        this.sendErrorResponse(res, 401, 'INVALID_CREDENTIALS');
      } else if (err.message.includes('USER_ACCOUNT_INACTIVE')) {
        this.sendErrorResponse(res, 403, 'USER_ACCOUNT_INACTIVE');
      } else {
        this.sendErrorResponse(res, 500, 'LOGIN_FAILED');
      }
    }
  }

  /**
   * Maneja la renovación de tokens JWT
   * @param req - Request HTTP con token actual
   * @param res - Response HTTP
   */
  async refreshToken(req: RefreshTokenRequest, res: Response): Promise<void> {
    try {
      if (!req.body.token) {
        this.sendErrorResponse(res, 400, 'TOKEN_REQUIRED');
        return;
      }

      const refreshResponse = await this.authService.refreshToken(req.body.token);

      this.sendSuccessResponse(res, 200, {
        message: 'TOKEN_REFRESHED_SUCCESSFULLY',
        data: refreshResponse
      });

    } catch (error) {
      // Type assertion para el error
      const err = error as ControllerError;
      
      console.error('Error en AuthController.refreshToken:', err.message);
      
      if (err.message.includes('INVALID_TOKEN_CANNOT_REFRESH')) {
        this.sendErrorResponse(res, 401, 'INVALID_TOKEN');
      } else {
        this.sendErrorResponse(res, 500, 'TOKEN_REFRESH_FAILED');
      }
    }
  }

  /**
   * Maneja la verificación de tokens JWT
   * @param req - Request HTTP con token a verificar
   * @param res - Response HTTP
   */
  async verifyToken(req: VerifyTokenRequest, res: Response): Promise<void> {
    try {
      if (!req.body.token) {
        this.sendErrorResponse(res, 400, 'TOKEN_REQUIRED');
        return;
      }

      const payload = await this.authService.verifyToken(req.body.token);

      this.sendSuccessResponse(res, 200, {
        message: 'TOKEN_IS_VALID',
        data: { user: payload }
      });

    } catch (error) {
      // Type assertion para el error
      const err = error as ControllerError;
      
      console.error('Error en AuthController.verifyToken:', err.message);
      
      if (err.message.includes('INVALID_TOKEN')) {
        this.sendErrorResponse(res, 401, 'INVALID_TOKEN');
      } else if (err.message.includes('TOKEN_EXPIRED')) {
        this.sendErrorResponse(res, 401, 'TOKEN_EXPIRED');
      } else {
        this.sendErrorResponse(res, 500, 'TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Endpoint para obtener la política de passwords
   * Útil para que el frontend muestre requisitos al usuario
   * @param req - Request HTTP
   * @param res - Response HTTP
   */
  async getPasswordPolicy(req: Request, res: Response): Promise<void> {
    try {
      const policy = this.authService.getPasswordPolicy();

      this.sendSuccessResponse(res, 200, {
        message: 'PASSWORD_POLICY_RETRIEVED',
        data: policy
      });

    } catch (error) {
      // Type assertion para el error
      const err = error as ControllerError;
      
      console.error('Error en AuthController.getPasswordPolicy:', err.message);
      this.sendErrorResponse(res, 500, 'FAILED_TO_RETRIEVE_PASSWORD_POLICY');
    }
  }

  /**
   * Valida los datos básicos de registro
   * @param data - Datos del request
   * @returns true si los datos son válidos
   */
  private validateRegisterData(data: any): boolean {
    const requiredFields = [
      'first_name', 
      'last_name', 
      'username', 
      'email', 
      'password', 
      'user_type'
    ];

    return requiredFields.every(field => 
      data[field] !== undefined && 
      data[field] !== null && 
      data[field] !== ''
    );
  }

  /**
   * Envía una respuesta HTTP de éxito estandarizada
   * @param res - Response object
   * @param statusCode - Código HTTP de éxito
   * @param data - Datos a incluir en la respuesta
   */
  private sendSuccessResponse(res: Response, statusCode: number, data: any): void {
    const response: ApiResponse = {
      success: true,
      ...data
    };

    res.status(statusCode).json(response);
  }

  /**
   * Envía una respuesta HTTP de error estandarizada
   * @param res - Response object
   * @param statusCode - Código HTTP de error
   * @param error - Mensaje de error
   */
  private sendErrorResponse(res: Response, statusCode: number, error: string): void {
    const response: ApiResponse = {
      success: false,
      error
    };

    res.status(statusCode).json(response);
  }

async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  try {
    const resetToken = await this.generateResetToken(email);
    
    // Add this line - import the email service first
    await enviarEmailRecuperacion(email, resetToken);
    
    return {
      success: true,
      email: email,
      resetToken: resetToken // For testing
    };

  } catch (error) {
    // For security, always return success even if email doesn't exist
    return {
      success: true,
      email: email
    };
  }
}

  async validateResetToken(req: ValidateResetTokenRequest, res: Response): Promise<void> {
  try {
    if (!req.body.token) {
      this.sendErrorResponse(res, 400, 'TOKEN_REQUIRED');
      return;
    }

    const isValid = await this.authService.validateResetToken(req.body.token);
    
    this.sendSuccessResponse(res, 200, {
      message: 'TOKEN_IS_VALID',
      data: { valid: isValid }
    });

  } catch (error) {
    const err = error as ControllerError;
    
    if (err.message.includes('INVALID_TOKEN') || err.message.includes('EXPIRED_TOKEN')) {
      this.sendErrorResponse(res, 400, 'INVALID_OR_EXPIRED_TOKEN');
    } else {
      this.sendErrorResponse(res, 500, 'TOKEN_VALIDATION_FAILED');
    }
  }
  }

  async resetPassword(req: ResetPasswordRequest, res: Response): Promise<void> {
  try {
    if (!req.body.token || !req.body.newPassword) {
      this.sendErrorResponse(res, 400, 'TOKEN_AND_PASSWORD_REQUIRED');
      return;
    }

    await this.authService.resetPassword(req.body.token, req.body.newPassword);
    
    this.sendSuccessResponse(res, 200, {
      message: 'PASSWORD_UPDATED_SUCCESSFULLY'
    });

  } catch (error) {
    const err = error as ControllerError;
    
    if (err.message.includes('INVALID_TOKEN') || err.message.includes('EXPIRED_TOKEN')) {
      this.sendErrorResponse(res, 400, 'INVALID_OR_EXPIRED_TOKEN');
    } else if (err.message.includes('WEAK_PASSWORD')) {
      this.sendErrorResponse(res, 400, 'WEAK_PASSWORD');
    } else {
      this.sendErrorResponse(res, 500, 'PASSWORD_RESET_FAILED');
    }
  }
  }


}