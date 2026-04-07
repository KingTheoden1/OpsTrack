import { api } from './client';
import type { User } from '../types';

export interface AuthResponse {
  token: string;
  user: User;
}

export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/api/auth/login', { email, password }).then((r) => r.data);

export const register = (email: string, password: string, role: string) =>
  api.post<AuthResponse>('/api/auth/register', { email, password, role }).then((r) => r.data);
