export const triggerHaptic = (pattern: number | number[] = 10): void => {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore if vibration is not permitted or supported.
  }
};

