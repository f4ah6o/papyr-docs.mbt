import {
  parseWorkspaceBundle,
  serializeWorkspaceBundle,
  validateWorkspace,
  workspaceToState,
  type WorkspaceExportBundle,
  type WorkspaceManifest,
  type WorkspaceState,
} from '@f12o/papyr-workspace';

const WORKSPACES_PREFIX = 'workspaces';

export interface WorkspaceStorageBackend {
  list(path: string): Promise<string[]>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, value: string): Promise<void>;
  delete(path: string): Promise<void>;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface WorkspaceStore {
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  createWorkspace(workspace: WorkspaceState): Promise<WorkspaceState>;
  loadWorkspace(workspaceId: string): Promise<WorkspaceState | null>;
  saveWorkspace(workspace: WorkspaceState): Promise<void>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  exportWorkspace(workspaceId: string): Promise<WorkspaceExportBundle>;
  importWorkspace(bundle: WorkspaceExportBundle): Promise<WorkspaceState>;
}

export function createOpfsWorkspaceStore(
  options: {
    backend?: WorkspaceStorageBackend;
  } = {},
): WorkspaceStore {
  const backend = options.backend ?? createBrowserOpfsBackend();

  return {
    async listWorkspaces(): Promise<WorkspaceSummary[]> {
      const workspaceIds = await backend.list(WORKSPACES_PREFIX);
      const manifests = await Promise.all(
        workspaceIds.map(async (workspaceId) => {
          const manifest = await readJson<WorkspaceManifest>(
            backend,
            workspacePath(workspaceId, 'manifest.json'),
          );
          if (!manifest) return null;
          return {
            id: manifest.id,
            name: manifest.name,
            updatedAt: manifest.updatedAt,
          };
        }),
      );
      return manifests
        .filter((manifest): manifest is WorkspaceSummary => manifest !== null)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    async createWorkspace(workspace: WorkspaceState): Promise<WorkspaceState> {
      await this.saveWorkspace(workspace);
      return workspace;
    },

    async loadWorkspace(workspaceId: string): Promise<WorkspaceState | null> {
      const manifest = await readJson<WorkspaceManifest>(
        backend,
        workspacePath(workspaceId, 'manifest.json'),
      );
      if (!manifest) return null;
      const site = await readJson<WorkspaceState['site']>(
        backend,
        workspacePath(workspaceId, 'site.json'),
      );
      if (!site) return null;
      const documentFiles = await backend.list(workspacePath(workspaceId, 'documents'));
      const documents = (
        await Promise.all(
          documentFiles
            .filter((entry) => entry.endsWith('.json'))
            .map(async (entry) =>
              readJson<WorkspaceState['documents'][number]>(
                backend,
                workspacePath(workspaceId, 'documents', entry),
              ),
            ),
        )
      ).filter((doc): doc is WorkspaceState['documents'][number] => doc !== null);
      const publishTarget = await readJson<WorkspaceState['publishTarget']>(
        backend,
        workspacePath(workspaceId, 'publish-target.json'),
      );
      return {
        manifest: {
          ...manifest,
          documentOrder:
            manifest.documentOrder.length > 0
              ? manifest.documentOrder
              : documents.map((doc) => doc.id),
        },
        site,
        documents: sortDocumentsByManifest(documents, manifest.documentOrder),
        ...(publishTarget ? { publishTarget } : {}),
      };
    },

    async saveWorkspace(workspace: WorkspaceState): Promise<void> {
      const validation = validateWorkspace(workspace);
      if (!validation.valid) {
        throw new Error(`workspace validation failed:\n${validation.issues.join('\n')}`);
      }
      await writeJson(
        backend,
        workspacePath(workspace.manifest.id, 'manifest.json'),
        workspace.manifest,
      );
      await writeJson(backend, workspacePath(workspace.manifest.id, 'site.json'), workspace.site);

      const documentsDir = workspacePath(workspace.manifest.id, 'documents');
      const existingFiles = await backend.list(documentsDir).catch(() => []);
      const expectedFiles = new Set(
        workspace.documents.map((document) => `${encodeURIComponent(document.id)}.json`),
      );
      await Promise.all(
        existingFiles
          .filter((entry) => entry.endsWith('.json') && !expectedFiles.has(entry))
          .map((entry) => backend.delete(workspacePath(workspace.manifest.id, 'documents', entry))),
      );
      await Promise.all(
        workspace.documents.map((document) =>
          writeJson(
            backend,
            workspacePath(
              workspace.manifest.id,
              'documents',
              `${encodeURIComponent(document.id)}.json`,
            ),
            document,
          ),
        ),
      );

      if (workspace.publishTarget) {
        await writeJson(
          backend,
          workspacePath(workspace.manifest.id, 'publish-target.json'),
          workspace.publishTarget,
        );
      } else {
        await backend.delete(workspacePath(workspace.manifest.id, 'publish-target.json'));
      }
    },

    async deleteWorkspace(workspaceId: string): Promise<void> {
      await backend.delete(workspacePath(workspaceId));
    },

    async exportWorkspace(workspaceId: string): Promise<WorkspaceExportBundle> {
      const workspace = await this.loadWorkspace(workspaceId);
      if (!workspace) throw new Error(`workspace ${workspaceId} not found`);
      return serializeWorkspaceBundle(workspace);
    },

    async importWorkspace(bundle: WorkspaceExportBundle): Promise<WorkspaceState> {
      const parsed = parseWorkspaceBundle(bundle);
      const workspace = workspaceToState(parsed);
      const workspaceId = await resolveImportedWorkspaceId(backend, workspace.manifest.id);
      const importedWorkspace =
        workspaceId === workspace.manifest.id
          ? workspace
          : renameImportedWorkspace(workspace, workspaceId);
      await this.saveWorkspace(importedWorkspace);
      return importedWorkspace;
    },
  };
}

const defaultStore = createOpfsWorkspaceStore();

export function listWorkspaces(): Promise<WorkspaceSummary[]> {
  return defaultStore.listWorkspaces();
}

export function createWorkspace(workspace: WorkspaceState): Promise<WorkspaceState> {
  return defaultStore.createWorkspace(workspace);
}

export function loadWorkspace(workspaceId: string): Promise<WorkspaceState | null> {
  return defaultStore.loadWorkspace(workspaceId);
}

export function saveWorkspace(workspace: WorkspaceState): Promise<void> {
  return defaultStore.saveWorkspace(workspace);
}

export function deleteWorkspace(workspaceId: string): Promise<void> {
  return defaultStore.deleteWorkspace(workspaceId);
}

export function exportWorkspace(workspaceId: string): Promise<WorkspaceExportBundle> {
  return defaultStore.exportWorkspace(workspaceId);
}

export function importWorkspace(bundle: WorkspaceExportBundle): Promise<WorkspaceState> {
  return defaultStore.importWorkspace(bundle);
}

export function createBrowserOpfsBackend(): WorkspaceStorageBackend {
  return {
    async list(path: string): Promise<string[]> {
      const directory = await getDirectoryHandle(path, false);
      if (!directory) return [];
      const entries: string[] = [];
      for await (const [name] of directory as unknown as AsyncIterable<[string, unknown]>) {
        entries.push(name);
      }
      entries.sort((left, right) => left.localeCompare(right));
      return entries;
    },

    async readText(path: string): Promise<string | null> {
      const fileHandle = await getFileHandle(path, false);
      if (!fileHandle) return null;
      const file = await fileHandle.getFile();
      return file.text();
    },

    async writeText(path: string, value: string): Promise<void> {
      const fileHandle = await getFileHandle(path, true);
      if (!fileHandle) throw new Error(`failed to open file ${path}`);
      const writer = await fileHandle.createWritable();
      await writer.write(value);
      await writer.close();
    },

    async delete(path: string): Promise<void> {
      const root = await getRootDirectory();
      const parts = splitPath(path);
      if (parts.length === 0) return;
      const parent = await walkDirectory(root, parts.slice(0, -1), false);
      if (!parent) return;
      await parent
        .removeEntry(parts[parts.length - 1]!, { recursive: true })
        .catch(() => undefined);
    },
  };
}

async function readJson<T>(backend: WorkspaceStorageBackend, path: string): Promise<T | null> {
  const raw = await backend.readText(path);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

async function writeJson(
  backend: WorkspaceStorageBackend,
  path: string,
  value: unknown,
): Promise<void> {
  await backend.writeText(path, JSON.stringify(value, null, 2));
}

function sortDocumentsByManifest(
  documents: WorkspaceState['documents'],
  documentOrder: string[],
): WorkspaceState['documents'] {
  const order = new Map(documentOrder.map((id, index) => [id, index] as const));
  return [...documents].sort((left, right) => {
    return (
      (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER) || left.id.localeCompare(right.id)
    );
  });
}

function workspacePath(...parts: string[]): string {
  return [WORKSPACES_PREFIX, ...parts].join('/');
}

async function resolveImportedWorkspaceId(
  backend: WorkspaceStorageBackend,
  requestedId: string,
): Promise<string> {
  const existing = await readJson<WorkspaceManifest>(
    backend,
    workspacePath(requestedId, 'manifest.json'),
  );
  if (!existing) return requestedId;

  let counter = 1;
  while (true) {
    const candidate = `${requestedId}-imported-${counter}`;
    const manifest = await readJson<WorkspaceManifest>(
      backend,
      workspacePath(candidate, 'manifest.json'),
    );
    if (!manifest) return candidate;
    counter += 1;
  }
}

function renameImportedWorkspace(workspace: WorkspaceState, workspaceId: string): WorkspaceState {
  const previousId = workspace.manifest.id;
  return {
    ...workspace,
    manifest: {
      ...workspace.manifest,
      id: workspaceId,
      updatedAt: new Date().toISOString(),
    },
    ...(workspace.publishTarget
      ? {
          publishTarget: {
            ...workspace.publishTarget,
            workspaceId:
              workspace.publishTarget.workspaceId === previousId
                ? workspaceId
                : workspace.publishTarget.workspaceId,
          },
        }
      : {}),
  };
}

async function getRootDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!('storage' in navigator) || typeof navigator.storage.getDirectory !== 'function') {
    throw new Error('OPFS is not available in this browser');
  }
  return navigator.storage.getDirectory();
}

async function getDirectoryHandle(
  path: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  const root = await getRootDirectory();
  const parts = splitPath(path);
  return walkDirectory(root, parts, create);
}

async function getFileHandle(path: string, create: boolean): Promise<FileSystemFileHandle | null> {
  const parts = splitPath(path);
  const filename = parts.pop();
  if (!filename) return null;
  const root = await getRootDirectory();
  const directory = await walkDirectory(root, parts, create);
  if (!directory) return null;
  try {
    return await directory.getFileHandle(filename, { create });
  } catch {
    if (!create) return null;
    throw new Error(`failed to create file ${path}`);
  }
}

async function walkDirectory(
  root: FileSystemDirectoryHandle,
  parts: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  let current = root;
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create });
    } catch {
      if (!create) return null;
      throw new Error(`failed to open directory ${parts.join('/')}`);
    }
  }
  return current;
}

function splitPath(path: string): string[] {
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}
