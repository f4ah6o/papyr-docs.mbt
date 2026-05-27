import { describe, expect, it } from 'vitest';
import {
  createStarterWorkspace,
  parseWorkspaceBundle,
  serializeWorkspaceBundle,
  validateWorkspace,
  workspaceToState,
} from './workspace.js';

describe('workspace helpers', () => {
  it('creates a valid starter workspace', () => {
    const workspace = createStarterWorkspace({
      id: 'starter',
      name: 'Starter Site',
      now: '2026-05-02T00:00:00.000Z',
    });

    expect(validateWorkspace(workspace)).toEqual({
      valid: true,
      issues: [],
    });
    expect(workspace.manifest.documentOrder).toHaveLength(3);
    expect(workspace.site.title).toBe('Starter Site');
  });

  it('round-trips bundle serialization', () => {
    const workspace = createStarterWorkspace({
      id: 'roundtrip',
      now: '2026-05-02T00:00:00.000Z',
    });
    workspace.publishTarget = {
      endpoint: 'https://example.com/api/workspaces/demo/publish',
      workspaceId: 'demo',
      token: 'secret',
    };

    const bundle = serializeWorkspaceBundle(workspace);
    const reparsed = parseWorkspaceBundle(bundle);

    expect(reparsed.publishTarget).toEqual({
      endpoint: 'https://example.com/api/workspaces/demo/publish',
      workspaceId: 'demo',
    });
    expect(workspaceToState(reparsed).documents.map((doc) => doc.id)).toEqual(
      workspace.documents.map((doc) => doc.id),
    );
  });

  it('reports missing chapter book references', () => {
    const workspace = createStarterWorkspace({
      id: 'broken',
      now: '2026-05-02T00:00:00.000Z',
    });
    const chapter = workspace.documents.find((doc) => doc.id.includes('--'));
    const publication = chapter?.meta?.publication as
      | { kind?: string; bookId?: string }
      | undefined;
    if (!chapter || !publication || publication.kind !== 'chapter') {
      throw new Error('expected starter chapter');
    }
    publication.bookId = 'missing-book';

    const validation = validateWorkspace(workspace);
    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain(
      'chapter broken-handbook--getting-started references missing book missing-book',
    );
  });

  it('rejects unsupported bundle versions', () => {
    expect(() =>
      parseWorkspaceBundle({
        version: 2,
        exportedAt: '2026-05-02T00:00:00.000Z',
        manifest: {},
        site: {},
        documents: [],
      }),
    ).toThrow('workspace bundle version must be 1');
  });

  it('rejects bundles with missing required fields', () => {
    expect(() =>
      parseWorkspaceBundle({
        version: 1,
        exportedAt: '2026-05-02T00:00:00.000Z',
        manifest: {
          id: 'missing-site',
          name: 'Missing Site',
          createdAt: '2026-05-02T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
          documentOrder: [],
        },
        site: {
          title: '',
          tagline: '',
          homeIntro: '',
        },
        documents: [],
      }),
    ).toThrow('workspace site title is required');
  });

  it('rejects bundles with unresolved chapter book references', () => {
    const workspace = createStarterWorkspace({
      id: 'broken-import',
      now: '2026-05-02T00:00:00.000Z',
    });
    const bundle = serializeWorkspaceBundle(workspace);
    const chapter = bundle.documents.find((doc) => doc.id.includes('--'));
    const publication = chapter?.meta?.publication as
      | { kind?: string; bookId?: string }
      | undefined;
    if (!chapter || !publication || publication.kind !== 'chapter') {
      throw new Error('expected starter chapter');
    }
    publication.bookId = 'missing-book';

    expect(() => parseWorkspaceBundle(bundle)).toThrow('references missing book missing-book');
  });
});
