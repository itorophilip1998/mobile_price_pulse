import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@pricepulse/onboarding_completed';

export const onboardingStorage = {
  getHasCompletedOnboarding: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  },

  setHasCompletedOnboarding: async (completed: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to set onboarding completed', e);
    }
  },
};
