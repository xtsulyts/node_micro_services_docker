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


router.post('/request-password-reset', async (req, res) => {
  try {
    console.log('📤 [GATEWAY] Enviando solicitud de reset de contraseña:', { 
      email: req.body.email 
    });
    
    const result = await authService.requestPasswordReset(req.body.email);
    
    console.log('✅ [GATEWAY] Solicitud de reset exitosa:', { 
      email: req.body.email,
      response: result 
    });
    
    res.json(result);
  } catch (error: any) {
    console.log('❌ [GATEWAY] Error en solicitud de reset:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error en solicitud de reset';
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data
    });
  }
});

router.post('/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('📤 [GATEWAY] Validando token de reset:', { 
      token: token 
    });
    
    const result = await authService.validateResetToken(token);
    
    console.log('✅ [GATEWAY] Validación de token exitosa:', { 
      token: token,
      response: result 
    });
    
    res.json(result);
  } catch (error: any) {
    console.log('❌ [GATEWAY] Error en validación de token:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error en validación de token';
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    console.log('📤 [GATEWAY] Procesando reset de contraseña:', { 
      token: token,
      newPassword: '***' 
    });
    
    const result = await authService.resetPassword(token, newPassword);
    
    console.log('✅ [GATEWAY] Reset de contraseña exitoso:', { 
      token: token,
      response: result 
    });
    
    res.json(result);
  } catch (error: any) {
    console.log('❌ [GATEWAY] Error en reset de contraseña:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error en reset de contraseña';
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data
    });
  }
});
});

export const authRoutes = router;