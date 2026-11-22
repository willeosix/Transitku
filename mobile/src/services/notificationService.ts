import { Alert } from 'react-native';

export interface ReminderResult {
  scheduled: boolean;
  message: string;
}

export async function scheduleDepartureReminder(
  plateNumber: string,
  corridorName: string,
  etaMinutes: number
): Promise<ReminderResult> {
  const leadMinutes = Math.max(1, etaMinutes - 2);
  const triggerSeconds = Math.max(5, Math.min(leadMinutes * 60, 600));

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus === 'granted') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Armada ${plateNumber} segera tiba`,
          body: `${corridorName} berstatus longgar (GREEN), perkiraan tiba ${etaMinutes} menit lagi`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: triggerSeconds,
        },
      });

      return {
        scheduled: true,
        message: `Pengingat aktif untuk ${plateNumber} (${leadMinutes} menit sebelum tiba)`,
      };
    }
  } catch {
    setTimeout(() => {
      Alert.alert(
        `Armada ${plateNumber} segera tiba`,
        `${corridorName} berstatus longgar (GREEN), perkiraan tiba ${etaMinutes} menit lagi`
      );
    }, Math.min(triggerSeconds, 30) * 1000);

    return {
      scheduled: true,
      message: `Pengingat in-app aktif untuk ${plateNumber} (${leadMinutes} menit sebelum tiba)`,
    };
  }

  return {
    scheduled: false,
    message: 'Izin notifikasi belum aktif pada perangkat Anda',
  };
}
