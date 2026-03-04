import '../src/config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import routes from '../src/routes/v1/index';
import { databaseConnection } from '../src/config/Conexion';

/**
 * Servidor principal de la aplicación
 */
class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = this.getPort();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private getPort(): number {
    const port = parseInt(process.env.PORT || '3000');
    if (isNaN(port) || port < 1 || port > 65535) {
      console.warn('⚠️  Puerto inválido, usando puerto por defecto 3000');
      return 3000;
    }
    return port;
  }

  private initializeMiddlewares(): void {
  
    this.app.use(helmet());
    
    // CORS configurado para desarrollo
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Logging de requests
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
      console.log('🔧 Modo desarrollo activado');
    } else {
      this.app.use(morgan('combined'));
    }

    this.app.use(express.json({ 
      limit: process.env.JSON_LIMIT || '10mb' 
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: process.env.URL_ENCODED_LIMIT || '10mb' 
    }));

    // Header de seguridad personalizado
    this.app.use((req, res, next) => {
      res.header('X-Powered-By', 'Under Tango API');
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      next();
    });
  }


  private initializeRoutes(): void {
    //this.app.use('/', routes);
    this.app.use('/', routes);

    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: '🚀 Node microservices Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        documentation: '/api'
      });
    });
  }

  /**
   * Configura el manejo global de errores
   */
  private initializeErrorHandling(): void {
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'ROUTE_NOT_FOUND',
        message: `Route ${req.originalUrl} not found`,
        suggestion: 'Visit /api for available endpoints'
      });
    });

    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('🚨 Global error handler:', error);

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An internal server error occurred',
        ...(isDevelopment && { 
          stack: error.stack,
          details: error 
        })
      });
    });
  }

  /**
   * Inicializa la base de datos y verifica la conexión
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await databaseConnection.execute('SELECT 1 as db_test');
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error('DATABASE_CONNECTION_FAILED');
    }
  }

  /**
   * Inicia el servidor
   */
  public async start(): Promise<void> {
    try {
      await this.initializeDatabase();

      this.app.listen(this.port, '0.0.0.0', () => {
        this.printStartupMessage();
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Muestra mensaje de inicio con información del servidor
   */
  private printStartupMessage(): void {
    console.log('\n' + '✨'.repeat(50));
    console.log('🚀 Gateway microservices Successfully!');
    console.log('✨'.repeat(50));
    console.log(`📍 Port: ${this.port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️ Database: ${process.env.DB_NAME || 'Not configured'}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log('✨'.repeat(50));

    // Mostrar endpoints disponibles
    console.log('\n📋 Available Endpoints:');
    console.log('   GET  /                       - Welcome message');
    console.log('   GET  /api/health            - Health check');
    console.log('   POST /api/v1/auth/register  - User registration');
    console.log('   POST /api/v1/auth/login     - User login');
    console.log('   POST /api/v1/auth/refresh-token - Token refresh');
    console.log('   POST /api/v1/auth/verify-token  - Token verification');
    console.log('   GET  /api/v1/auth/password-policy - Password policy');
    console.log('   POST /api/v1/auth/request-password-reset - Request password reset');
    console.log('   POST /api/v1/auth/validate-reset-token   - Validate reset token');
    console.log('   POST /api/v1/auth/reset-password         - Reset password with token');
    console.log('');
    }

  public async close(): Promise<void> {
    try {
      await databaseConnection.close();
      console.log('✅ Server shut down gracefully');
    } catch (error) {
      console.error('❌ Error during server shutdown:', error);
      throw error;
    }
  }
}

// Crear e iniciar el servidor
const server = new Server();

// Manejo de cierre graceful para producción
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  try {
    await server.close();
    console.log('✅ Server shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Iniciar servidor
server.start().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

export default server;