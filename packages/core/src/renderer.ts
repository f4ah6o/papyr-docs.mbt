import type { Block, PapyrDocument } from './document.js';

export interface Renderer<TOutput> {
  renderDocument(doc: PapyrDocument): TOutput;
  renderBlock(block: Block): TOutput;
}
