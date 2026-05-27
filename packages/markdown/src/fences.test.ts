import { describe, expect, it } from 'vitest';
import {
  isPapyrFence,
  MERMAID_FENCE,
  PAPYR_EXCALIDRAW_FENCE,
  PAPYR_TABLE_FENCE,
} from './fences.js';

describe('isPapyrFence', () => {
  it('recognizes papyr-table / papyr-excalidraw / mermaid', () => {
    expect(isPapyrFence(PAPYR_TABLE_FENCE)).toBe(true);
    expect(isPapyrFence(PAPYR_EXCALIDRAW_FENCE)).toBe(true);
    expect(isPapyrFence(MERMAID_FENCE)).toBe(true);
  });

  it('rejects other languages', () => {
    expect(isPapyrFence('ts')).toBe(false);
    expect(isPapyrFence(null)).toBe(false);
    expect(isPapyrFence(undefined)).toBe(false);
  });
});
