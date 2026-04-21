import { api } from './client';
import type { Asset } from '../types';

export const getAssets = () => api.get<Asset[]>('/api/assets').then((r) => r.data);

export const createAsset = (data: Partial<Asset>) =>
  api.post<Asset>('/api/assets', data).then((r) => r.data);

export const updateAsset = (id: number, data: Partial<Asset>) =>
  api.patch<Asset>(`/api/assets/${id}`, data).then((r) => r.data);

export const deleteAsset = (id: number) => api.delete(`/api/assets/${id}`);
