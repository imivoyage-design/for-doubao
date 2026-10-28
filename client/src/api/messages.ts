import axios from 'axios';

// 会话列表
export const getConversations = () => axios.get('/api/messages/conversations');

// 与某用户的聊天记录
export const getMessages = (peerUserId: string) =>
  axios.get(`/api/messages/conversations/${peerUserId}/messages`);

// 发送私信
export const sendMessage = (toUserId: string, content: string) =>
  axios.post('/api/messages/send', { toUserId, content });
