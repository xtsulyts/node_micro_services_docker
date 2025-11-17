import { Router } from 'express';
import { userService } from './../../services/authServices'

const router = Router();

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    res.json(result);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'Error en login';
    res.status(status).json({ error: message });
  }
});

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const result = await userService.register(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'Error en registro';
    res.status(status).json({ error: message });
  }
});

export const userRoutes = router;