import type { PapyrDocument } from '@f12o/papyr-core';

export interface BridgeDiagnostic {
  kind: string;
  code: string;
  path: string;
  message: string;
  expected?: string | null;
  received?: string | null;
}

export interface ArtifactFile {
  path: string;
  content: string;
}

export interface ProjectionSourceEntry {
  path: string;
  source: string;
  frontmatter: Record<string, unknown>;
  document: PapyrDocument;
}

export interface ProjectionInput {
  sourceEntries: ProjectionSourceEntry[];
  generatedAt: string;
}

export interface ProjectionSuccess {
  ok: true;
  artifacts: ArtifactFile[];
}

export interface ProjectionFailure {
  ok: false;
  message: string;
  diagnostics: BridgeDiagnostic[];
}

export type ProjectionResult = ProjectionSuccess | ProjectionFailure;

// Stable shape between JS caller and the projection backend. The CLI bridge
// implements this through a subprocess; a future WASM bridge will implement
// the same interface so build-content does not need to know which backend is
// in use.
export interface BuildBridge {
  runProjection(input: ProjectionInput): Promise<ProjectionResult>;
}
