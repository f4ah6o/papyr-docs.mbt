export function shouldUseNativeTextareaFallback(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): boolean {
  const { userAgent, platform, maxTouchPoints } = input;
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
  // iPadOS desktop mode still commonly reports MacIntel, so this deprecated API remains
  // the most reliable signal when it is paired with touch capability.
  const isIPadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;
  return isIOSDevice || isIPadDesktopMode;
}
