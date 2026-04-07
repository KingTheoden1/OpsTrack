import { api } from './client';
import type { Defect } from '../types';

export const getDefects = () => api.get<Defect[]>('/api/defects').then((r) => r.data);

export const createDefect = (data: Partial<Defect>) =>
  api.post<Defect>('/api/defects', data).then((r) => r.data);

export const updateDefect = (id: number, data: Partial<Defect>) =>
  api.patch<Defect>(`/api/defects/${id}`, data).then((r) => r.data);

export const deleteDefect = (id: number) => api.delete(`/api/defects/${id}`);
