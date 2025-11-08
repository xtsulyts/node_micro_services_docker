import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

// Interface para opciones de hashing
interface HashOptions {
  saltRounds?: number;
}

// Interface para resultado de verificación
interface VerificationResult {
  isValid: boolean;
  needsUpdate?: boolean;
}

/**
 * Servicio encargado de todas las operaciones criptográficas
 * Incluye hashing de passwords, comparación y utilidades de seguridad
 */
export class CryptoService {
  private readonly defaultSaltRounds: number;

  constructor(saltRounds: number = 12) {
    this.defaultSaltRounds = saltRounds;
  }

  /**
   * Genera hash seguro de un password usando bcrypt
   * @param password - Password en texto plano
   * @param options - Opciones de hashing (salt rounds)
   * @returns Password hasheado listo para almacenar en BD
   */
  async hashPassword(password: string, options: HashOptions = {}): Promise<string> {
    try {
      const saltRounds = options.saltRounds || this.defaultSaltRounds;
      
      if (!password || password.length === 0) {
        throw new Error('PASSWORD_CANNOT_BE_EMPTY');
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;

    } catch (error) {
      console.error('Error en CryptoService.hashPassword:', error);
      throw new Error('PASSWORD_HASHING_FAILED');
    }
  }

  /**
   * Compara un password en texto plano con un hash almacenado
   * @param plainPassword - Password en texto plano (input del usuario)
   * @param hashedPassword - Password hasheado (almacenado en BD)
   * @returns Resultado de la verificación con indicador de necesidad de actualización
   */
  async comparePasswords(
    plainPassword: string, 
    hashedPassword: string
  ): Promise<VerificationResult> {
    try {
      if (!plainPassword || !hashedPassword) {
        return { isValid: false };
      }

      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      
      // Verificar si el hash necesita actualización (algoritmo obsoleto o menos rounds)
      const needsUpdate = await this.needsHashUpdate(hashedPassword);
      
      return { isValid, needsUpdate };

    } catch (error) {
      console.error('Error en CryptoService.comparePasswords:', error);
      return { isValid: false };
    }
  }

  /**
   * Verifica si un hash necesita ser actualizado
   * Útil para migrar hashes antiguos a algoritmos más seguros
   * @param hashedPassword - Hash a verificar
   * @returns true si el hash necesita actualización
   */
  private async needsHashUpdate(hashedPassword: string): Promise<boolean> {
    try {
      // bcrypt almacena el número de rounds en el hash mismo
      // Si los rounds actuales son mayores que los usados en el hash, necesita update
      const currentRounds = this.defaultSaltRounds;
      const hashRounds = this.getRoundsFromHash(hashedPassword);
      
      return hashRounds < currentRounds;

    } catch (error) {
      console.error('Error en CryptoService.needsHashUpdate:', error);
      return false;
    }
  }

  /**
   * Extrae el número de rounds de un hash de bcrypt
   * @param hashedPassword - Hash de bcrypt
   * @returns Número de rounds usados en el hash
   */
  private getRoundsFromHash(hashedPassword: string): number {
    try {
      // El formato de bcrypt es: $2b$rounds$salt+hash
      const parts = hashedPassword.split('$');
      if (parts.length >= 3) {
        const rounds = parseInt(parts[2]);
        return isNaN(rounds) ? 10 : rounds; // Default a 10 si no se puede parsear
      }
      return 10;
    } catch {
      return 10;
    }
  }

  /**
   * Genera un token seguro aleatorio
   * Útil para tokens de verificación, reset de password, etc.
   * @param length - Longitud del token en bytes (default: 32)
   * @returns Token hexadecimal seguro
   */
  generateSecureToken(length: number = 32): string {
    try {
      if (length < 16) {
        throw new Error('TOKEN_LENGTH_TOO_SHORT');
      }

      const token = randomBytes(length).toString('hex');
      return token;

    } catch (error) {
      console.error('Error en CryptoService.generateSecureToken:', error);
      throw new Error('TOKEN_GENERATION_FAILED');
    }
  }

  /**
   * Genera hash SHA256 de un string
   * Útil para checksums, verificaciones de integridad, etc.
   * @param data - Datos a hashear
   * @returns Hash SHA256 en hexadecimal
   */
  generateSHA256Hash(data: string): string {
    try {
      if (!data) {
        throw new Error('DATA_CANNOT_BE_EMPTY');
      }

      const hash = createHash('sha256');
      hash.update(data);
      return hash.digest('hex');

    } catch (error) {
      console.error('Error en CryptoService.generateSHA256Hash:', error);
      throw new Error('HASH_GENERATION_FAILED');
    }
  }

  /**
   * Valida la fortaleza de un password según políticas de seguridad
   * @param password - Password a validar
   * @returns true si cumple con los requisitos de seguridad
   */
  validatePasswordStrength(password: string): boolean {
    if (!password || password.length < 8) {
      return false;
    }

    // Requisitos de seguridad:
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Mínimo 3 de 4 criterios
    const criteriaMet = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;

    return criteriaMet >= 3;
  }

  /**
   * Obtiene información sobre la política de passwords
   * Útil para mostrar requisitos en el frontend
   * @returns Objeto con los requisitos de seguridad
   */
  getPasswordPolicy(): {
    minLength: number;
    requiresUpperCase: boolean;
    requiresLowerCase: boolean;
    requiresNumbers: boolean;
    requiresSpecialChars: boolean;
    description: string;
  } {
    return {
      minLength: 8,
      requiresUpperCase: true,
      requiresLowerCase: true,
      requiresNumbers: true,
      requiresSpecialChars: true,
      description: 'Mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos'
    };
  }
}