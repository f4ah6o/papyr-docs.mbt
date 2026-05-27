import { describe, expect, it } from 'vitest';
import { parseMoonCliJson } from './cli-bridge.js';

describe('parseMoonCliJson', () => {
  it('extracts the success envelope from the last JSON line of stdout', () => {
    const stdout = [
      'moon: building src/cmd/main',
      'some unrelated log',
      JSON.stringify({
        ok: true,
        command: 'build-docs',
        artifacts: { files: [{ path: 'manifest.json', content: '{}\n' }] },
      }),
    ].join('\n');
    const result = parseMoonCliJson(stdout);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artifacts.files).toHaveLength(1);
    }
  });

  it('extracts a failure envelope with diagnostics passthrough', () => {
    const failure = {
      ok: false,
      message: 'invalid publication tree',
      diagnostics: [
        {
          kind: 'validation',
          code: 'duplicate_slug',
          path: 'documents.0',
          message: 'slug が重複しています',
        },
      ],
    };
    const stdout = `build log line\n${JSON.stringify(failure)}\n`;
    const result = parseMoonCliJson(stdout);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.code).toBe('duplicate_slug');
    }
  });

  it('throws when no JSON line is present', () => {
    expect(() => parseMoonCliJson('only logs, no json\nstill no json\n')).toThrow(
      /failed to parse MoonBit CLI JSON/,
    );
  });
});
