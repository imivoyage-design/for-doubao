import axios from 'axios';

// 提交举报
export const createReport = (data: {
  targetId: string;
  targetType: 'post' | 'comment';
  reason: 'spam' | 'abuse' | 'ad' | 'other';
  description?: string;
}) => axios.post('/api/reports', data);

// 管理员：举报列表
export const getReports = (status?: string) =>
  axios.get('/api/reports', { params: { status } });

// 管理员：处理举报
export const handleReport = (id: string, action: 'delete_content' | 'mute_user' | 'ignore') =>
  axios.patch(`/api/reports/${id}/handle`, { action });
