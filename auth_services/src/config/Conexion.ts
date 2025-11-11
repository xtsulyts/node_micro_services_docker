import '../config/env';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();



// Interface para la configuración de la base de datos
interface DatabaseConfig {
  host: string;
  user: string;
  database: string;
  //password: string;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  reconnect?: boolean;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: mysql.Pool;
  private config: DatabaseConfig;

  constructor() {
    // Validar variables de entorno esenciales primero
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Faltan variables de entorno esenciales: ${missingVars.join(', ')}`);
    }

    this.config = {
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      database: process.env.DB_NAME!,
      //password: process.env.DB_PASSWORD!,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '20'), 
      queueLimit: 0,
      //acquireTimeout: 60000, // 60 segundos timeout
      //timeout: 60000, // 60 segundos para queries largos
      //reconnect: true
    };

    this.pool = mysql.createPool(this.config);
    this.testConnection();
  }

  // Patrón Singleton para una única instancia de conexión
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // Obtener conexión del pool
  public async getConnection(): Promise<mysql.PoolConnection> {
    try {
      const connection = await this.pool.getConnection();
      
      // Configurar la conexión para mejor performance
      await connection.execute('SET time_zone = "+00:00"');
      await connection.execute('SET NAMES utf8mb4');
      
      return connection;
    } catch (error) {
      console.error('❌ Error al obtener conexión de la base de datos:', error);
      throw new Error('DATABASE_CONNECTION_ERROR');
    }
  }

  // Ejecutar queries directamente (método principal)
  public async execute<T = any>(query: string, params: any[] = []): Promise<T> {
    let connection: mysql.PoolConnection | null = null;
    try {
      connection = await this.getConnection();
      const [rows] = await connection.execute(query, params);
      return rows as T;
    } catch (error) {
      // Convertir error a un tipo que tenga 'code' y 'message'
      const err = error as { code?: string; message: string };
      console.error('❌ Error ejecutando query:', {
        query: query.substring(0, 100) + '...',
        params: params.map(p => typeof p === 'string' ? p.substring(0, 50) : p),
        error: err.message
      });
      
      // Manejar errores específicos de MySQL
      if (err.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_ENTRY');
      }
      if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_ROW_IS_REFERENCED') {
        throw new Error('FOREIGN_KEY_CONSTRAINT');
      }
      if (err.code === 'ER_LOCK_WAIT_TIMEOUT' || err.code === 'ER_LOCK_DEADLOCK') {
        throw new Error('DATABASE_LOCK_TIMEOUT');
      }
      
      throw new Error('DATABASE_QUERY_ERROR');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Ejecutar transacciones
  public async executeTransaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error en transacción:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Probar la conexión al inicializar
  private async testConnection(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      
      // Ejecutar query de prueba
      const [result] = await connection.execute('SELECT 1 as test');
      console.log('✅ Conexión a la base de datos establecida correctamente');
      
      connection.release();
    } catch (error) {
      console.error('❌ Error al conectar con la base de datos:', error);
      throw new Error('DATABASE_CONNECTION_FAILED');
    }
  }

  // Métodos para monitoreo y métricas
  public getPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    queueLength: number;
  } {
    // Hacemos un cast a 'any' para acceder a las propiedades internas
    const poolAny = this.pool as any;
    return {
      totalConnections: poolAny._allConnections.length,
      activeConnections: poolAny._acquiringConnections,
      idleConnections: poolAny._freeConnections.length,
      queueLength: poolAny._connectionQueue.length
    };
  }

  // Cerrar todas las conexiones (para graceful shutdown)
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('✅ Conexiones de la base de datos cerradas correctamente');
    } catch (error) {
      console.error('❌ Error cerrando conexiones:', error);
      throw new Error('DATABASE_CLOSE_ERROR');
    }
  }
}

// Exportar instancia única
export const databaseConnection = DatabaseConnection.getInstance();

// Exportar tipos útiles para los modelos
export type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';