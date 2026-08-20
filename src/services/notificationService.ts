import api from './api';

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  email_status: 'pending' | 'sent' | 'failed' | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

export const notificationService = {
  /**
   * Get paginated notifications for the current user
   */
  getNotifications: async (page = 1, limit = 20): Promise<NotificationsResponse> => {
    const response = await api.get('/notifications', { params: { page, limit } });
    return response.data?.data ?? { notifications: [], total: 0, page: 1, totalPages: 1 };
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count');
    return response.data?.data?.count ?? 0;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: number): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<number> => {
    const response = await api.put('/notifications/read-all');
    return response.data?.data?.count ?? 0;
  },
};

export default notificationService;