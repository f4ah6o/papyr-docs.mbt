import { describe, expect, it } from 'vitest';
import { shouldUseNativeTextareaFallback } from './editor-platform.js';

describe('shouldUseNativeTextareaFallback', () => {
  it('uses the native textarea path on iPhone Safari', () => {
    expect(
      shouldUseNativeTextareaFallback({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('uses the native textarea path on iPadOS desktop mode', () => {
    expect(
      shouldUseNativeTextareaFallback({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('uses the native textarea path on iPad mobile Safari', () => {
    expect(
      shouldUseNativeTextareaFallback({
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('keeps the overlay path on desktop browsers', () => {
    expect(
      shouldUseNativeTextareaFallback({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });

  it('keeps the overlay path on Android Chrome', () => {
    expect(
      shouldUseNativeTextareaFallback({
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe(false);
  });
});
