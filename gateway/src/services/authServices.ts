import axios from 'axios';
import { config } from '../config/env';

export class AuthServices{
  private baseURL = config.USER_SERVICE_URL;

  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, {
      email,
      password
    });
    return response.data;
  }

  async register(userData: any) {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/register`, userData);
    return response.data;
  }
}

export const authService = new AuthServices();