import { describe, expect, it } from 'vitest';
import { BuildPipelineError, toFailureEnvelope } from './build-error.js';

describe('BuildPipelineError', () => {
  it('prefixes the message with the phase tag', () => {
    const error = new BuildPipelineError('js-parse', 'frontmatter is broken');
    expect(error.message).toBe('[js-parse] frontmatter is broken');
    expect(error.phase).toBe('js-parse');
    expect(error.diagnostics).toEqual([]);
  });

  it('carries diagnostics for mbt-projection failures', () => {
    const diagnostics = [
      {
        kind: 'validation',
        code: 'duplicate_slug',
        path: 'documents.0',
        message: 'slug が重複しています',
      },
    ];
    const error = new BuildPipelineError('mbt-projection', 'projection failed', diagnostics);
    expect(error.diagnostics).toBe(diagnostics);
  });
});

describe('toFailureEnvelope', () => {
  it('produces a machine-readable js-parse envelope without the phase prefix', () => {
    const envelope = toFailureEnvelope(
      new BuildPipelineError('js-parse', 'content ディレクトリが存在しません: /tmp/missing'),
    );
    expect(envelope).toEqual({
      ok: false,
      phase: 'js-parse',
      message: 'content ディレクトリが存在しません: /tmp/missing',
      diagnostics: [],
    });
  });

  it('produces an mbt-projection envelope that passes diagnostics through unchanged', () => {
    const diagnostics = [
      {
        kind: 'validation',
        code: 'missing_book',
        path: 'documents.2.meta.bookId',
        message: 'bookId が解決できません',
        expected: 'string',
        received: null,
      },
    ];
    const envelope = toFailureEnvelope(
      new BuildPipelineError('mbt-projection', 'invalid publication tree', diagnostics),
    );
    expect(envelope.phase).toBe('mbt-projection');
    expect(envelope.message).toBe('invalid publication tree');
    expect(envelope.diagnostics).toEqual(diagnostics);
  });
});

