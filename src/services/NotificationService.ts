/**
 * NotificationService — wraps expo-notifications for disease alerts.
 * Respects the notifications setting before sending.
 *
 * Usage:
 *   const notif = NotificationService.getInstance();
 *   await notif.init();
 *   await notif.sendDiseaseAlert('Healthy', 0.92);
 */
import * as ExpoNotifications from 'expo-notifications';

// Configure in-app notification presentation
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private permissionGranted = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permission. Call once on app start.
   * @returns true if granted, false otherwise.
   */
  public async init(): Promise<boolean> {
    try {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('[NotificationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Send a local notification for disease detection results.
   * Only sends if notifications are enabled in settings.
   * @param enabled Whether notifications are enabled in app settings
   * @param diseaseLabel The detected leaf label (e.g. "Diseased")
   * @param confidence Model confidence score (0–1)
   */
  public async sendDiseaseAlert(
    enabled: boolean,
    diseaseLabel: string,
    confidence: number,
  ): Promise<void> {
    if (!enabled) return;

    if (!this.permissionGranted) {
      // Try to re-request — harmless if already denied
      this.permissionGranted = await this.init();
    }

    if (!this.permissionGranted) {
      console.debug('[NotificationService] Permission denied — skipping notification.');
      return;
    }

    const isDiseased = /disease|bad|sick|infected|moldy/i.test(diseaseLabel);
    const title = isDiseased
      ? 'Leaf Disease Detected'
      : 'Healthy Leaf Detected';

    const body = isDiseased
      ? `Result: ${diseaseLabel} (${(confidence * 100).toFixed(1)}% confidence). Consider taking action.`
      : `Result: ${diseaseLabel} (${(confidence * 100).toFixed(1)}% confidence). Plant looks healthy!`;

    await this.scheduleNotification({ title, body });
  }

  private async scheduleNotification(notification: {
    title: string;
    body: string;
  }): Promise<void> {
    try {
      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { type: 'DISEASE_ALERT' },
        },
        trigger: null, // Fire immediately
      });
      console.info(`[NotificationService] Sent: "${notification.title}"`);
    } catch (error) {
      console.error('[NotificationService] Failed to schedule notification:', error);
    }
  }
}
