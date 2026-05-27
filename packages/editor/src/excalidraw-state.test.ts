import { describe, expect, it } from 'vitest';
import { sanitizeExcalidrawAppState } from './excalidraw-state.js';

describe('sanitizeExcalidrawAppState', () => {
  it('keeps the JSON-safe appState subset', () => {
    expect(
      sanitizeExcalidrawAppState({
        viewBackgroundColor: '#ffffff',
        gridSize: 16,
        collaborators: { bad: true },
        gesture: { pointers: {} },
      }),
    ).toEqual({
      viewBackgroundColor: '#ffffff',
      gridSize: 16,
    });
  });

  it('returns undefined when no supported keys exist', () => {
    expect(sanitizeExcalidrawAppState({ collaborators: { bad: true } })).toBeUndefined();
    expect(sanitizeExcalidrawAppState(null)).toBeUndefined();
  });
});
