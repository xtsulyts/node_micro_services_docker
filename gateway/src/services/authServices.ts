import axios from 'axios';
import { config } from '../config/env';

export class UserService {
  private baseURL = config.USER_SERVICE_URL;

  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password
    });
    return response.data;
  }

  async register(userData: any) {
    const response = await axios.post(`${this.baseURL}/auth/register`, userData);
    return response.data;
  }
}

export const userService = new UserService();