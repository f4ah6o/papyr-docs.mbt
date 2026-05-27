import { describe, expect, it } from 'vitest';
import {
  createUploadPlan,
  type UploadFile,
  type UploadManifest,
  type UploadManifestEntry,
} from './upload-r2.js';

function entry(sha256: string, size = 1, contentType = 'application/json'): UploadManifestEntry {
  return { sha256, size, contentType };
}

function file(key: string, manifestEntry: UploadManifestEntry): UploadFile {
  return {
    path: `/dist/content/r2/${key}`,
    key,
    entry: manifestEntry,
  };
}

function manifest(files: Record<string, UploadManifestEntry>): UploadManifest {
  return {
    version: 1,
    generatedAt: '2026-05-26T00:00:00.000Z',
    files,
  };
}

describe('createUploadPlan', () => {
  it('uploads everything when the remote upload manifest is missing', () => {
    const files = [file('books/book-a.json', entry('a')), file('manifest.json', entry('m'))];

    expect(createUploadPlan(files, undefined)).toEqual({
      puts: files,
      deletes: [],
    });
  });

  it('uploads only changed files and deletes stale remote keys', () => {
    const unchanged = entry('same', 12);
    const changed = entry('next', 20);
    const files = [
      file('books/book-a.json', unchanged),
      file('docs/doc-a.json', changed),
      file('manifest.json', entry('manifest-next')),
    ];

    expect(
      createUploadPlan(
        files,
        manifest({
          'books/book-a.json': unchanged,
          'docs/doc-a.json': entry('previous', 20),
          'raw/removed.md': entry('old', 4, 'text/markdown; charset=utf-8'),
        }),
      ),
    ).toEqual({
      puts: [files[1], files[2]],
      deletes: ['raw/removed.md'],
    });
  });

  it('treats content type and size changes as updates even when the hash matches', () => {
    const files = [file('raw/doc.md', entry('same-hash', 20, 'text/markdown; charset=utf-8'))];

    expect(
      createUploadPlan(
        files,
        manifest({
          'raw/doc.md': entry('same-hash', 19, 'text/markdown; charset=utf-8'),
        }),
      ).puts,
    ).toEqual(files);
  });
});
