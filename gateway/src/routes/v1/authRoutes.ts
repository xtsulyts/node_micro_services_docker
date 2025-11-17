import { Router } from 'express';
import { authService } from '../../services/authServices';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    console.log('📤 [GATEWAY] Enviando login a servicio auth:', { 
      email: req.body.email,
      password: '***' 
    });
    
    const result = await authService.login(req.body.email, req.body.password);
    
    console.log('✅ [GATEWAY] Login exitoso:', { 
      email: req.body.email,
      response: result 
    });
    
    res.json(result);
  } catch (error: any) {
    console.log('❌ [GATEWAY] Error en login:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error en login';
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    console.log('📤 [GATEWAY] Enviando registro a servicio auth:', { 
      ...req.body,
      password: '***' 
    });
    
    const result = await authService.register(req.body);
    
    console.log('✅ [GATEWAY] Registro exitoso:', { 
      email: req.body.email,
      response: result 
    });
    
    res.json(result);
  } catch (error: any) {
    console.log('❌ [GATEWAY] Error en registro:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error en registro';
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data
    });
  }
});

export const authRoutes = router;