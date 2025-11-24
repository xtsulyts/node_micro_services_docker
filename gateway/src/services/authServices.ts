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


  async requestPasswordReset(email: string) {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/request-password-reset`, {
      email
    });
    return response.data;
  }

  async validateResetToken(token: string) {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/validate-reset-token`, {
      token
    });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/reset-password`, {
      token,
      newPassword
    });
    return response.data;
  }
}

export const authService = new AuthServices();