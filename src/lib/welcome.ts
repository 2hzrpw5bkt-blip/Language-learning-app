import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether this user has seen the one-time "How it works" screen on this device.
const key = (userId: string) => `welcome-seen:${userId}`;

export async function hasSeenWelcome(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === '1';
  } catch {
    return true;
  }
}

export async function markWelcomeSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), '1');
  } catch {
    // Not critical: worst case the screen shows again next time.
  }
}
