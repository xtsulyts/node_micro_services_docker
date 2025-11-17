import express from 'express'
import cors from 'cors';
import { config } from './config/env';
import { authRoutes } from './routes/v1/authRoutes'

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Gateway',
    userService: config.USER_SERVICE_URL,
    timestamp: new Date().toISOString()
  });
});

// Ruta de fallback
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(config.PORT, () => {
  console.log('=================================');
  console.log(`🚀 Gateway ejecutándose en puerto ${config.PORT}`);
  console.log(`🔗 Servicio de usuarios: ${config.USER_SERVICE_URL}`);
  console.log('=================================');
});