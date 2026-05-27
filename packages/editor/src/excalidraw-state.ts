export interface StoredExcalidrawAppState extends Record<string, unknown> {
  viewBackgroundColor?: string;
  gridSize?: number | null;
}

export function sanitizeExcalidrawAppState(value: unknown): StoredExcalidrawAppState | undefined {
  if (!isObject(value)) return undefined;

  const next: StoredExcalidrawAppState = {};
  if (
    typeof value.viewBackgroundColor === 'string' &&
    value.viewBackgroundColor.trim().length > 0
  ) {
    next.viewBackgroundColor = value.viewBackgroundColor;
  }
  if (typeof value.gridSize === 'number' || value.gridSize === null) {
    next.gridSize = value.gridSize;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
