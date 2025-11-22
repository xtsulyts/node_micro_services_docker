import { databaseConnection, ResultSetHeader, RowDataPacket } from '../config/Conexion';

// Interfaz para los datos de usuario (sin password por seguridad)
export interface User {
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
  modified: Date;
}

// Interfaz para crear usuario (incluye password)
export interface CreateUserData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string; // Password hasheado que vendrá del servicio
  user_type: number;
  phone?: string;
  photo?: string;
}

// Interface para errores de MySQL
interface MySqlError {
  code: string;
  message: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

interface SaveResetTokenParams {
  userId: number;
  token: string;
  expiresAt: Date;
}

interface ResetTokenWithEmail {
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  email: string;
}

interface PasswordUpdateParams {
  userId: number;
  hashedPassword: string;
}

export class UserModel {
  /**
   * Crea un nuevo usuario en la base de datos
   * @param userData - Datos del usuario a crear
   * @returns Usuario creado sin información sensible
   */
  async create(userData: CreateUserData): Promise<User> {
    try {
      // Query para insertar el usuario
      const insertQuery = `
        INSERT INTO users (first_name, last_name, username, email, password, user_type, phone, photo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertValues = [
        userData.first_name,
        userData.last_name,
        userData.username,
        userData.email,
        userData.password, // Password ya hasheado desde el servicio
        userData.user_type,
        userData.phone || null,
        userData.photo || null
      ];

      // Ejecutar inserción
      const result = await databaseConnection.execute<ResultSetHeader>(insertQuery, insertValues);
      const userId = result.insertId;

      // Obtener el usuario recién creado (sin password)
      const selectQuery = `
        SELECT user_id, first_name, last_name, username, email, user_type, phone, photo, active, created, modified 
        FROM users WHERE user_id = ?
      `;
      
      const users = await databaseConnection.execute<RowDataPacket[]>(selectQuery, [userId]);

      if (!users || users.length === 0) {
        throw new Error('USER_NOT_FOUND_AFTER_CREATION');
      }

      return users[0] as User;

    } catch (error) {
      // Type assertion para el error de MySQL
      const mysqlError = error as MySqlError;
      
      console.error('Error en UserModel.create:', mysqlError.message);
      
      // Manejar error de duplicado de email o username
      if (mysqlError.code === 'ER_DUP_ENTRY') {
        if (mysqlError.message.includes('email')) {
          throw new Error('EMAIL_ALREADY_EXISTS');
        }
        if (mysqlError.message.includes('username')) {
          throw new Error('USERNAME_ALREADY_EXISTS');
        }
      }
      
      throw new Error('DATABASE_ERROR');
    }
  }

  /**
   * Busca usuario por email para proceso de login
   * @param email - Email del usuario a buscar
   * @returns Usuario con toda la información incluyendo password hasheado
   */
  async findByEmail(email: string): Promise<(User & { password: string }) | null> {
    try {
      const users = await databaseConnection.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ? AND active = TRUE',
        [email]
      );

      if (!users || users.length === 0) {
        return null;
      }

      return users[0] as User & { password: string };

    } catch (error) {
      const mysqlError = error as MySqlError;
      console.error('Error en UserModel.findByEmail:', mysqlError.message);
      throw new Error('DATABASE_ERROR');
    }
  }

  /**
   * Busca usuario por username para validar duplicados
   * @param username - Username a verificar
   * @returns Usuario si existe, null si no existe
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const users = await databaseConnection.execute<RowDataPacket[]>(
        `SELECT user_id, first_name, last_name, username, email, user_type, phone, photo, active, created, modified 
         FROM users WHERE username = ?`,
        [username]
      );

      return users && users.length > 0 ? (users[0] as User) : null;

    } catch (error) {
      const mysqlError = error as MySqlError;
      console.error('Error en UserModel.findByUsername:', mysqlError.message);
      throw new Error('DATABASE_ERROR');
    }
  }

  /**
   * Busca usuario por ID
   * @param userId - ID del usuario a buscar
   * @returns Usuario encontrado o null
   */
  async findById(userId: number): Promise<User | null> {
    try {
      const users = await databaseConnection.execute<RowDataPacket[]>(
        `SELECT user_id, first_name, last_name, username, email, user_type, phone, photo, active, created, modified 
         FROM users WHERE user_id = ? AND active = TRUE`,
        [userId]
      );

      return users && users.length > 0 ? (users[0] as User) : null;

    } catch (error) {
      const mysqlError = error as MySqlError;
      console.error('Error en UserModel.findById:', mysqlError.message);
      throw new Error('DATABASE_ERROR');
    }
  }

  async saveResetToken(params: SaveResetTokenParams): Promise<void> {
  try {
    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at) 
      VALUES (?, ?, ?)
    `;
    
    await databaseConnection.execute<ResultSetHeader>(query, [
      params.userId, 
      params.token, 
      params.expiresAt
    ]);
    
  } catch (error) {
    const mysqlError = error as MySqlError;
    console.error('Error en UserModel.saveResetToken:', mysqlError.message);
    throw new Error('FAILED_TO_SAVE_RESET_TOKEN');
  }
  }

  async findResetToken(token: string): Promise<ResetTokenWithEmail | null>  {
  try {
    const query = `
      SELECT prt.*, u.email 
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.user_id
      WHERE prt.token = ? AND prt.used = FALSE AND u.active = TRUE
    `;
    
    const tokens = await databaseConnection.execute<RowDataPacket[]>(query, [token]);
    
    if (!tokens || tokens.length === 0) {
      return null;
    }
    
    const tokenData = tokens[0];
    return {
      userId: tokenData.user_id,
      token: tokenData.token,
      expiresAt: new Date(tokenData.expires_at),
      used: tokenData.used === 1,
      email: tokenData.email
    };
    
  } catch (error) {
    const mysqlError = error as MySqlError;
    console.error('Error en UserModel.findResetToken:', mysqlError.message);
    throw new Error('DATABASE_ERROR');
  }
  }


  async markTokenAsUsed(token: string): Promise<void> {
  try {
    const query = `
      UPDATE password_reset_tokens 
      SET used = TRUE 
      WHERE token = ?
    `;
    
    await databaseConnection.execute<ResultSetHeader>(query, [token]);
    
  } catch (error) {
    const mysqlError = error as MySqlError;
    console.error('Error en UserModel.markTokenAsUsed:', mysqlError.message);
    throw new Error('FAILED_TO_INVALIDATE_TOKEN');
  }
  }

  async updatePassword(params: PasswordUpdateParams): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET password = ?, modified = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `;
      
      await databaseConnection.execute<ResultSetHeader>(query, [params.hashedPassword, params.userId]);
      
    } catch (error) {
      const mysqlError = error as MySqlError;
      console.error('Error en UserModel.updatePassword:', mysqlError.message);
      throw new Error('PASSWORD_UPDATE_FAILED');
    }
    }

  async cleanupExpiredTokens(): Promise<void> {
  try {
    const query = `DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE`;
    await databaseConnection.execute<ResultSetHeader>(query);
  } catch (error) {
    const mysqlError = error as MySqlError;
    console.error('Error en UserModel.cleanupExpiredTokens:', mysqlError.message);
  }
}
}