import { describe, expect, it } from 'vitest';
import { createStarterWorkspace } from '@f12o/papyr-workspace';
import { createOpfsWorkspaceStore, type WorkspaceStorageBackend } from './opfs.js';

class MemoryBackend implements WorkspaceStorageBackend {
  private files = new Map<string, string>();

  seedText(path: string, value: string): void {
    this.files.set(path, value);
  }

  async list(path: string): Promise<string[]> {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    const entries = new Set<string>();
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const next = rest.split('/')[0];
      if (next) entries.add(next);
    }
    return [...entries].sort((left, right) => left.localeCompare(right));
  }

  async readText(path: string): Promise<string | null> {
    return this.files.get(path) ?? null;
  }

  async writeText(path: string, value: string): Promise<void> {
    this.files.set(path, value);
  }

  async delete(path: string): Promise<void> {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    this.files.delete(path);
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(prefix)) this.files.delete(key);
    }
  }
}

describe('createOpfsWorkspaceStore', () => {
  it('saves, lists, loads, exports, and deletes workspaces', async () => {
    const store = createOpfsWorkspaceStore({ backend: new MemoryBackend() });
    const workspace = createStarterWorkspace({
      id: 'team-docs',
      name: 'Team Docs',
      now: '2026-05-02T00:00:00.000Z',
    });
    workspace.publishTarget = {
      endpoint: 'https://example.com/api/workspaces/team-docs/publish',
      workspaceId: 'team-docs',
      token: 'secret',
    };

    await store.createWorkspace(workspace);

    await expect(store.listWorkspaces()).resolves.toEqual([
      {
        id: 'team-docs',
        name: 'Team Docs',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    ]);

    const loaded = await store.loadWorkspace('team-docs');
    expect(loaded?.publishTarget?.token).toBe('secret');

    const bundle = await store.exportWorkspace('team-docs');
    expect(bundle.publishTarget).toEqual({
      endpoint: 'https://example.com/api/workspaces/team-docs/publish',
      workspaceId: 'team-docs',
    });

    await store.deleteWorkspace('team-docs');
    await expect(store.loadWorkspace('team-docs')).resolves.toBeNull();
  });

  it('imports a bundle as a new workspace', async () => {
    const store = createOpfsWorkspaceStore({ backend: new MemoryBackend() });
    const workspace = createStarterWorkspace({
      id: 'import-me',
      now: '2026-05-02T00:00:00.000Z',
    });
    const bundle = {
      version: 1 as const,
      exportedAt: '2026-05-02T00:00:00.000Z',
      manifest: workspace.manifest,
      site: workspace.site,
      documents: workspace.documents,
    };

    const imported = await store.importWorkspace(bundle);
    expect(imported.manifest.id).toBe('import-me');
    expect(imported.documents).toHaveLength(3);
  });

  it('renames imported workspaces when the id already exists', async () => {
    const backend = new MemoryBackend();
    const store = createOpfsWorkspaceStore({ backend });
    const workspace = createStarterWorkspace({
      id: 'collision',
      now: '2026-05-02T00:00:00.000Z',
    });
    workspace.publishTarget = {
      endpoint: 'https://example.com/api/workspaces/collision/publish',
      workspaceId: 'collision',
      token: 'secret',
    };

    await store.createWorkspace(workspace);
    const imported = await store.importWorkspace(await store.exportWorkspace('collision'));

    expect(imported.manifest.id).toBe('collision-imported-1');
    expect(imported.publishTarget?.workspaceId).toBe('collision-imported-1');
    await expect(store.listWorkspaces()).resolves.toHaveLength(2);
  });

  it('rebuilds document order when the manifest order is empty', async () => {
    const backend = new MemoryBackend();
    const store = createOpfsWorkspaceStore({ backend });
    const workspace = createStarterWorkspace({
      id: 'recovery',
      now: '2026-05-02T00:00:00.000Z',
    });

    await store.createWorkspace(workspace);
    backend.seedText(
      'workspaces/recovery/manifest.json',
      JSON.stringify({ ...workspace.manifest, documentOrder: [] }, null, 2),
    );

    const loaded = await store.loadWorkspace('recovery');
    expect(new Set(loaded?.manifest.documentOrder)).toEqual(
      new Set(loaded?.documents.map((document) => document.id)),
    );
  });
});
