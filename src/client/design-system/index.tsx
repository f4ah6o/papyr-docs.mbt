import React from 'react';
import { createRoot } from 'react-dom/client';
import { DesignSystemApp } from './App.js';

export function mountDesignSystem(container: HTMLElement): () => void {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DesignSystemApp />
    </React.StrictMode>,
  );
  return () => root.unmount();
}
