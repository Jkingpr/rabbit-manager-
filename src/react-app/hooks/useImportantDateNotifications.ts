import { useEffect } from 'react';

export function useImportantDateNotifications() {
  useEffect(() => {
    // Check once when component mounts
    checkImportantDates();

    // Check daily (every 24 hours)
    const interval = setInterval(() => {
      checkImportantDates();
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}

async function checkImportantDates() {
  try {
    // Check if service worker and push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[IMPORTANT_DATES] Push notifications not supported');
      return;
    }

    // Check if user has granted notification permission
    if (Notification.permission !== 'granted') {
      console.log('[IMPORTANT_DATES] Notification permission not granted');
      return;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check if user has an active push subscription
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[IMPORTANT_DATES] No push subscription found');
      return;
    }

    // Call backend to check for important dates
    const response = await fetch('/api/notifications/check-important-dates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[IMPORTANT_DATES] Checked successfully:', data);
    } else {
      console.error('[IMPORTANT_DATES] Failed to check:', await response.text());
    }
  } catch (error) {
    console.error('[IMPORTANT_DATES] Error checking important dates:', error);
  }
}
