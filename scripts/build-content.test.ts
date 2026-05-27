import { describe, expect, it } from 'vitest';
import { runBuildContent } from './build-content.js';
import type { BuildBridge } from './lib/build-bridge.js';

describe('runBuildContent', () => {
  it('falls back when an injected bridge returns an empty artifact list', async () => {
    const bridge: BuildBridge = {
      async runProjection() {
        return { ok: true, artifacts: [] };
      },
    };

    await expect(
      runBuildContent({
        bridge,
        generatedAt: '2026-05-27T00:00:00.000Z',
      }),
    ).resolves.toBeUndefined();
  });
});
