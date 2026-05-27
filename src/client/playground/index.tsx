import React from 'react';
import { createRoot } from 'react-dom/client';
import { PlaygroundApp } from './App.js';

export function mountPlayground(container: HTMLElement): () => void {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <PlaygroundApp />
    </React.StrictMode>,
  );
  return () => root.unmount();
}
