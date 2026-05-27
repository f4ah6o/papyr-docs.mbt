import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdvancedPlaygroundApp } from './App.js';

export function mountAdvancedPlayground(container: HTMLElement): () => void {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AdvancedPlaygroundApp />
    </React.StrictMode>,
  );
  return () => root.unmount();
}
