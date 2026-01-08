'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import api from '@/lib/api';

// This component handles notification polling and sound alerts
export default function NotificationService() {
  const { user, isAuthenticated } = useAuthStore();
  const { updateTicketStatus, addNotification } = useNotificationStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let userInteracted = false;

    // Mark user interaction to enable audio
    const enableAudio = () => {
      userInteracted = true;
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => { });
      }
    };

    // Add event listeners for user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, enableAudio, { once: true });
    });

    // Create audio context after user interaction
    const getAudioContext = async () => {
      if (!audioContext) {
        try {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
          console.warn('Could not create AudioContext:', error);
          return null;
        }
      }

      // Resume if suspended (required after user interaction)
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (error) {
          console.warn('Could not resume AudioContext:', error);
        }
      }

      return audioContext;
    };

    // Helper function to play a tone
    const playTone = (ctx: AudioContext) => {
      try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 800; // 800 Hz tone
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      } catch (error) {
        console.warn('Could not play tone:', error);
      }
    };

    // Simple beep sound using Web Audio API
    const playBeepSound = async () => {
      try {
        const ctx = await getAudioContext();
        if (ctx) {
          playTone(ctx);
        } else {
          // Fallback: create new context
          playFallbackSound();
        }
      } catch (error) {
        console.warn('Could not play beep sound:', error);
        playFallbackSound();
      }
    };

    // Fallback sound using Web Audio API directly
    const playFallbackSound = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Resume if suspended
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            playTone(ctx);
          }).catch(() => {
            // If resume fails, try anyway
            playTone(ctx);
          });
        } else {
          playTone(ctx);
        }
      } catch (error) {
        console.warn('Could not create AudioContext for fallback:', error);
      }
    };

    // Store function reference
    (audioRef as any).current = playBeepSound;

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, enableAudio);
      });
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => { });
      }
    };
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const playSound = (audioRef as any).current;
      if (playSound && typeof playSound === 'function') {
        // Call the function and handle any errors
        const result = playSound();
        if (result instanceof Promise) {
          result.catch((error) => {
            console.warn('Error playing notification sound:', error);
          });
        }
      } else {
        console.warn('Notification sound function not available');
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  // Get status label in Indonesian
  const getStatusLabel = useCallback((status: string) => {
    const labels: Record<string, string> = {
      OPEN: 'Open',
      IN_DELIVERY: 'Dikirim ke RC',
      RECEIVED: 'Diterima di RC',
      IN_PROGRESS: 'Sedang Diperbaiki',
      RESOLVED: 'Ready for Pickup',
      CLOSED: 'Selesai',
    };
    return labels[status] || status;
  }, []);

  // Poll for ticket updates - optimized for performance
  const pollTickets = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      // Always fetch full list to detect status changes (including RESOLVED, IN_PROGRESS, etc.)
      // Count endpoint only tracks OPEN/IN_DELIVERY, so we need full list to catch all status changes
      // Use pagination to reduce payload size - only fetch first page with minimal limit
      const response = await api.get('/tickets', {
        params: {
          page: 1,
          limit: 50, // Only check first 50 tickets for status changes
        },
      });
      // Handle both old format (array) and new format (object with data & pagination)
      const tickets = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || []);

      // Batch store updates to reduce re-renders
      const currentState = useNotificationStore.getState();
      const statusUpdates: Record<string, string> = {};
      const notifications: any[] = [];
      let shouldPlaySound = false;

      // Process tickets efficiently - batch all updates
      for (const ticket of tickets) {
        const lastStatus = currentState.lastCheckedTickets[ticket.id];
        const currentStatus = ticket.status;

        // Only create notification if status actually changed (not first time tracking)
        if (lastStatus && lastStatus !== currentStatus) {
          // Status has changed! Queue notification
          const oldStatusLabel = getStatusLabel(lastStatus);
          const newStatusLabel = getStatusLabel(currentStatus);

          notifications.push({
            type: 'SO_STATUS_CHANGE',
            title: `Status Service Order Berubah`,
            message: `Service Order ${ticket.ticketNumber} telah berubah dari ${oldStatusLabel} menjadi ${newStatusLabel}`,
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            oldStatus: oldStatusLabel,
            newStatus: newStatusLabel,
          });
          shouldPlaySound = true;
        }

        // Queue status update
        statusUpdates[ticket.id] = currentStatus;
      }

      // Batch update all statuses at once (single store update)
      if (Object.keys(statusUpdates).length > 0) {
        // Update all statuses in one batch
        Object.entries(statusUpdates).forEach(([ticketId, status]) => {
          updateTicketStatus(ticketId, status);
        });
      }

      // Add all notifications at once (single store update per notification, but batched in time)
      if (notifications.length > 0) {
        // Use requestIdleCallback to defer non-critical work
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            notifications.forEach(notification => {
              addNotification(notification);
            });
            if (shouldPlaySound) {
              setTimeout(() => {
                playNotificationSound();
              }, 100);
            }
          }, { timeout: 1000 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            notifications.forEach(notification => {
              addNotification(notification);
            });
            if (shouldPlaySound) {
              setTimeout(() => {
                playNotificationSound();
              }, 100);
            }
          }, 0);
        }
      }

      // If polling was stopped due to connection error, resume it now
      if (!pollingIntervalRef.current && isAuthenticated && user) {
        pollingIntervalRef.current = setInterval(pollTickets, 120000);
      }
    } catch (error: any) {
      // Handle rate limiting errors
      if (error.response?.status === 429) {
        console.warn('Rate limit reached. Polling will resume after delay.');
        // Stop polling temporarily - will resume on next mount or manual refresh
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Resume after 2 minutes
        setTimeout(() => {
          if (isAuthenticated && user) {
            pollingIntervalRef.current = setInterval(pollTickets, 120000);
          }
        }, 120000);
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || error.message?.includes('Network Error') || error.code === 'ERR_NETWORK_IO_SUSPENDED') {
        // Handle connection errors - backend is not available
        console.warn('Backend server is not available. Polling will resume when connection is restored.');
        // Stop polling when backend is unavailable
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Retry after 30 seconds to check if backend is back online
        setTimeout(() => {
          if (isAuthenticated && user) {
            pollTickets(); // Try once, then resume normal polling if successful
          }
        }, 30000);
      } else {
        // Other errors - log but don't stop polling
        console.error('Error polling tickets:', error);
      }
    }
  }, [isAuthenticated, user, updateTicketStatus, addNotification, getStatusLabel, playNotificationSound]);

  // Poll for unassigned repair tickets (for Hitachi users only)
  const lastUnassignedAlertRef = useRef<number>(0);
  const pollRepairs = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    // Only poll for Hitachi users
    if ((user as any).userType !== 'HITACHI') return;

    try {
      const response = await api.get('/repairs', {
        params: {
          page: 1,
          limit: 20,
          status: 'RECEIVED', // Only get RECEIVED tickets (waiting to be taken)
        },
      });

      const repairs = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || []);

      // Filter unassigned repairs waiting more than 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const unassignedRepairs = repairs.filter((repair: any) => {
        if (repair.repairedBy) return false; // Already assigned
        const receivedAt = new Date(repair.receivedAtRc);
        return receivedAt < thirtyMinutesAgo;
      });

      // Only alert once per 10 minutes to avoid spam
      const now = Date.now();
      if (unassignedRepairs.length > 0 && now - lastUnassignedAlertRef.current > 10 * 60 * 1000) {
        lastUnassignedAlertRef.current = now;

        addNotification({
          type: 'REPAIR_UNASSIGNED',
          title: `${unassignedRepairs.length} Repair Ticket Menunggu`,
          message: `Ada ${unassignedRepairs.length} repair ticket yang belum diambil selama >30 menit. Mohon segera diproses.`,
        });

        playNotificationSound();
      }
    } catch (error: any) {
      // Silent fail for repair polling - don't log to avoid noise
      if (error.response?.status !== 429 && error.code !== 'ERR_NETWORK') {
        console.warn('Error polling repairs:', error.message);
      }
    }
  }, [isAuthenticated, user, addNotification, playNotificationSound]);

  // Set up polling interval
  useEffect(() => {
    if (!isAuthenticated) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Initial poll (with delay to avoid immediate rate limit)
    const initialDelay = setTimeout(() => {
      pollTickets();
      pollRepairs(); // Also poll repairs on initial load
    }, 5000); // Wait 5 seconds before first poll

    // Poll every 120 seconds (2 minutes) - optimized to reduce server load
    // This means max 0.5 requests per minute, well under the 10/minute limit
    // Still responsive enough for real-time notifications while reducing API calls by 50%
    pollingIntervalRef.current = setInterval(() => {
      pollTickets();
      pollRepairs();
    }, 120000);

    // Cleanup function

    return () => {
      clearTimeout(initialDelay);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, user, pollTickets, pollRepairs]);

  // This component doesn't render anything
  return null;
}

