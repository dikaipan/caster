import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'SO_STATUS_CHANGE' | 'SO_CREATED' | 'SO_ASSIGNED' | 'DELIVERY_RECEIVED' | 'REPAIR_COMPLETED' | 'CASSETTE_RETURNED' | 'REPAIR_UNASSIGNED';
  title: string;
  message: string;
  ticketId?: string;
  ticketNumber?: string;
  oldStatus?: string;
  newStatus?: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastCheckedTickets: Record<string, string>; // ticketId -> status
  lastTicketCount: number; // Last known ticket count for polling optimization
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  updateTicketStatus: (ticketId: string, status: string) => boolean; // returns true if status changed
  setLastTicketCount: (count: number) => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      lastCheckedTickets: {},
      lastTicketCount: 0,

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random()}`,
          read: false,
          createdAt: new Date(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (notificationId) => {
        set((state) => {
          const notifications = state.notifications.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          );
          const unreadCount = notifications.filter((n) => !n.read).length;
          return { notifications, unreadCount };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
          unreadCount: 0,
        }));
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      updateTicketStatus: (ticketId, newStatus) => {
        const state = get();
        const lastStatus = state.lastCheckedTickets[ticketId];

        if (lastStatus && lastStatus !== newStatus) {
          // Status changed!
          set((state) => ({
            lastCheckedTickets: {
              ...state.lastCheckedTickets,
              [ticketId]: newStatus,
            },
          }));
          return true;
        } else if (!lastStatus) {
          // First time tracking this ticket
          set((state) => ({
            lastCheckedTickets: {
              ...state.lastCheckedTickets,
              [ticketId]: newStatus,
            },
          }));
        }

        return false;
      },

      getUnreadCount: () => {
        return get().unreadCount;
      },

      setLastTicketCount: (count: number) => {
        set({ lastTicketCount: count });
      },
    }),
    {
      name: 'notification-storage',
    }
  )
);

