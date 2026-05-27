import type { BridgeDiagnostic } from './build-bridge.js';

export type BuildPhase = 'js-parse' | 'mbt-projection';

export class BuildPipelineError extends Error {
  readonly phase: BuildPhase;
  readonly diagnostics: BridgeDiagnostic[];

  constructor(phase: BuildPhase, message: string, diagnostics: BridgeDiagnostic[] = []) {
    super(`[${phase}] ${message}`);
    this.name = 'BuildPipelineError';
    this.phase = phase;
    this.diagnostics = diagnostics;
  }
}

export interface BuildPipelineFailureEnvelope {
  ok: false;
  phase: BuildPhase;
  message: string;
  diagnostics: BridgeDiagnostic[];
}

export function toFailureEnvelope(error: BuildPipelineError): BuildPipelineFailureEnvelope {
  // Strip the `[phase] ` prefix added by the constructor so the envelope
  // message stays identical to what the caller passed in.
  const prefix = `[${error.phase}] `;
  const message = error.message.startsWith(prefix)
    ? error.message.slice(prefix.length)
    : error.message;
  return {
    ok: false,
    phase: error.phase,
    message,
    diagnostics: error.diagnostics,
  };
}
