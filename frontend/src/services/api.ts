import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 题目相关
export const questionApi = {
  list: (params?: { subject?: string; type?: string }) =>
    api.get('/questions/', { params }),
  get: (id: number) => api.get(`/questions/${id}`),
  stats: () => api.get('/questions/stats/overview'),
  delete: (id: number) => api.delete(`/questions/${id}`),
};

// 练习相关
export const practiceApi = {
  getNext: (limit = 20, subject?: string) =>
    api.get('/practice/next', { params: { limit, subject } }),
  answer: (data: { question_id: number; user_answer: string; time_spent?: number }) =>
    api.post('/practice/answer', data),
  recordAnswer: (data: { question_id: number; user_answer: string; time_spent?: number }) =>
    api.post('/practice/record-answer', data),
  rate: (data: { question_id: number; rating: number }) =>
    api.post('/practice/rate', data),
  dashboard: () => api.get('/practice/dashboard'),
};

// 导入相关
export const importApi = {
  docx: (file: File, subject: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    return api.post('/import/docx', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  docxPair: (questionFile: File, answerFile: File, subject: string) => {
    const formData = new FormData();
    formData.append('question_file', questionFile);
    formData.append('answer_file', answerFile);
    formData.append('subject', subject);
    return api.post('/import/docx-pair', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  sources: () => api.get('/import/sources'),
  deleteSource: (source: string) => api.delete(`/import/source/${source}`),
};

export default api;