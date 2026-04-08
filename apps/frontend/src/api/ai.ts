import axios from 'axios';
import { api } from './client';
import type { Defect } from '../types';

const aiClient = axios.create({
  baseURL: import.meta.env.VITE_AI_URL ?? 'http://localhost:8000',
});

export interface AnalysisResult {
  summary: string;
  risk_areas: string[];
  recommendations: string[];
}

export interface CsvPreviewResult {
  imported: number;
  preview: Array<{
    title: string;
    description: string;
    severity: string;
    status: string;
  }>;
}

export const analyzeDefects = (defects: Defect[]) =>
  aiClient.post<AnalysisResult>('/analyze', { defects }).then((r) => r.data);

export const previewCsv = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return aiClient.post<CsvPreviewResult>('/import-csv', form).then((r) => r.data);
};

export const bulkInsert = (
  rows: Array<{ title: string; description: string; severity: string; status: string }>
) => api.post('/api/defects/bulk', rows).then((r) => r.data);
