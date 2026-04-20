export const vibrate = (pattern) => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const hapticLight = () => vibrate(10);
export const hapticMedium = () => vibrate(20);
export const hapticHeavy = () => vibrate(30);
export const hapticStreaming = () => vibrate([5, 5]);
