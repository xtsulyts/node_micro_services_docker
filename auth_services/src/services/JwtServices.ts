import jwt from 'jsonwebtoken';

// Interface para el payload del token JWT
interface JwtPayload {
  userId: number;
  email: string;
  userType: number;
}

// Interface para opciones de generación de token
interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
}

// Interface para respuesta de token generado
interface TokenResponse {
  token: string;
  expiresIn: number;
  issuedAt: number;
}

// Interface para resultado de verificación de token
interface TokenVerificationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
}

// Interface para configuración del servicio JWT
interface JwtConfig {
  secret: string;
  defaultExpiresIn: string;
  issuer: string;
  audience: string;
}


/**
 * Servicio especializado en operaciones con tokens JWT
 * Maneja generación, verificación y renovación de tokens de forma segura
 */
export class JwtService {
  private readonly config: JwtConfig;

  constructor(config: JwtConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Genera un token JWT para un usuario autenticado
   * @param payload - Datos del usuario a incluir en el token
   * @param options - Opciones personalizadas para la generación del token
   * @returns Token JWT firmado y información relacionada
   */
  async generateToken(payload: JwtPayload, options: TokenOptions = {}): Promise<TokenResponse> {
    try {
    // 1. Construye las opciones normalmente (sin tipo jwt.SignOptions)
    const tokenOptions = {
      expiresIn: options.expiresIn || this.config.defaultExpiresIn,
      issuer: options.issuer || this.config.issuer,
      audience: options.audience || this.config.audience,
      algorithm: 'HS256' as const
    };

  // 2. Al pasar a jwt.sign, usa 'as any' para evitar el conflicto de tipos
  const token = jwt.sign(payload, this.config.secret, tokenOptions as any);
        
      // Decodificar el token para obtener información de expiración
      const decoded = jwt.decode(token) as { exp: number; iat: number };
      
      return {
        token,
        expiresIn: decoded.exp,
        issuedAt: decoded.iat
      };

    } catch (error) {
      console.error('Error en JwtService.generateToken:', error);
      throw new Error('TOKEN_GENERATION_FAILED');
    }
  }

  /**
   * Verifica y decodifica un token JWT
   * @param token - Token JWT a verificar
   * @returns Resultado de la verificación con payload si es válido
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      if (!token || typeof token !== 'string') {
        return { isValid: false, error: 'INVALID_TOKEN_FORMAT' };
      }

      const payload = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256']
      }) as JwtPayload;

      return {
        isValid: true,
        payload
      };

    } catch (error) {
      const jwtError = error as jwt.JsonWebTokenError;
      
      console.error('Error en JwtService.verifyToken:', jwtError.message);
      
      let errorCode = 'TOKEN_VERIFICATION_FAILED';
      if (jwtError.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorCode = 'INVALID_TOKEN';
      }

      return {
        isValid: false,
        error: errorCode
      };
    }
  }

  /**
   * Refresca un token JWT existente generando uno nuevo con el mismo payload
   * @param token - Token actual a refrescar
   * @returns Nuevo token con vida extendida
   */
  async refreshToken(token: string): Promise<TokenResponse> {
    try {
      const verificationResult = await this.verifyToken(token);
      
      if (!verificationResult.isValid || !verificationResult.payload) {
        throw new Error('INVALID_TOKEN_CANNOT_REFRESH');
      }

      // Generar nuevo token con el mismo payload
      const newToken = await this.generateToken(verificationResult.payload);
      return newToken;

    } catch (error) {
      console.error('Error en JwtService.refreshToken:', error);
      throw new Error('TOKEN_REFRESH_FAILED');
    }
  }

  /**
   * Decodifica un token JWT sin verificar la firma
   * Útil para obtener información básica de tokens expirados
   * @param token - Token a decodificar
   * @returns Payload decodificado o null si es inválido
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }

      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;

    } catch (error) {
      console.error('Error en JwtService.decodeToken:', error);
      return null;
    }
  }

  /**
   * Valida que la configuración del servicio sea correcta
   * @param config - Configuración a validar
   */
  private validateConfig(config: JwtConfig): void {
    if (!config.secret || config.secret.length < 32) {
      throw new Error('JWT_SECRET_TOO_WEAK');
    }

    if (!config.defaultExpiresIn) {
      throw new Error('DEFAULT_EXPIRES_IN_REQUIRED');
    }

    if (!config.issuer) {
      throw new Error('ISSUER_REQUIRED');
    }
  }

  /**
   * Obtiene el tiempo de expiración en segundos desde ahora
   * @param expiresIn - String de expiración (ej: "7d", "2h")
   * @returns Tiempo en segundos
   */
  getExpirationInSeconds(expiresIn: string): number {
    try {
      const now = Math.floor(Date.now() / 1000);
      const testToken = jwt.sign({ test: true }, this.config.secret, { expiresIn: '1h' }); 
      const decoded = jwt.decode(testToken) as { exp: number };
      
      return decoded.exp - now;

    } catch (error) {
      console.error('Error en JwtService.getExpirationInSeconds:', error);
      return 24 * 60 * 60; // Default 24 horas en segundos
    }
  }

  /**
   * Obtiene información sobre la configuración actual del servicio
   * @returns Configuración actual (sin el secret por seguridad)
   */
  getConfigInfo(): Omit<JwtConfig, 'secret'> {
    return {
      defaultExpiresIn: this.config.defaultExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience
    };
  }
}