export interface ModelContextClient {
  requestUserInteraction?(callback: () => void): void;
}

export interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  outputSchema?: object;
  execute: (
    input: Record<string, unknown>,
    client: ModelContextClient,
  ) => unknown | Promise<unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

interface ModelContext {
  registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): void;
}

interface NavigatorWithModelContext extends Navigator {
  modelContext?: ModelContext;
}

export function registerModelContextTools(tools: ModelContextTool[]): () => void {
  const modelContext = (navigator as NavigatorWithModelContext).modelContext;
  if (!modelContext || tools.length === 0) return () => {};

  const controller = new AbortController();
  for (const tool of tools) {
    modelContext.registerTool(tool, { signal: controller.signal });
  }
  return () => controller.abort();
}

export function runWithUserInteraction<T>(
  client: ModelContextClient,
  action: () => Promise<T> | T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const invoke = () => {
      void Promise.resolve()
        .then(action)
        .then(resolve, reject);
    };

    if (typeof client.requestUserInteraction === 'function') {
      client.requestUserInteraction(invoke);
      return;
    }

    invoke();
  });
}
