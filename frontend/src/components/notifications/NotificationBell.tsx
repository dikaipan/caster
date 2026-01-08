'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Eye, Clock } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SO_STATUS_CHANGE':
      case 'TICKET_STATUS_CHANGE': // Legacy support
        return '🔄';
      case 'SO_CREATED':
      case 'TICKET_CREATED': // Legacy support
        return '📝';
      case 'DELIVERY_RECEIVED':
        return '📦';
      case 'REPAIR_COMPLETED':
        return '✅';
      case 'CASSETTE_RETURNED':
        return '🔙';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group"
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold animate-pulse border-2 border-white dark:border-slate-800 shadow-lg z-10">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed lg:absolute right-4 lg:right-0 top-16 lg:top-full lg:mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-700 z-[9999] max-h-[calc(100vh-8rem)] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Notifikasi</h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {unreadCount} Baru
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={markAllAsRead}
                  className="text-xs gap-1 h-7 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <CheckCheck className="h-3 w-3" />
                  Tandai Semua Dibaca
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearNotifications}
                  className="text-xs gap-1 h-7 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus Semua
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Tidak ada notifikasi</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Notifikasi akan muncul di sini</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group',
                      !notification.read && 'bg-blue-50/50 dark:bg-blue-900/20'
                    )}
                    onClick={() => {
                      if (notification.ticketId) {
                        markAsRead(notification.id);
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.ticketNumber && (
                          <Link
                            href={`/tickets/${notification.ticketId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                              setIsOpen(false);
                            }}
                            className="inline-block mt-2"
                          >
                            <Badge variant="outline" className="text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                              {notification.ticketNumber}
                            </Badge>
                          </Link>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getTimeAgo(notification.createdAt)}
                          </p>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Link href="/notifications" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-sm gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Eye className="h-4 w-4" />
                  Lihat Semua Notifikasi ({notifications.length})
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

