import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  filterPublicationSummaries,
  isPublicationSection,
  isLlmUserAgent,
  resolveAppRoute,
  resolveLlmRedirectTarget,
  resolveRawMarkdownRoute,
  searchHref,
  type PublicationSummary,
} from './shared.js';

describe('resolveAppRoute', () => {
  it('playground route を解決する', () => {
    expect(resolveAppRoute('/playground')).toEqual({ name: 'playground' });
  });

  it('advanced playground route を解決する', () => {
    expect(resolveAppRoute('/playground/advanced')).toEqual({ name: 'advanced-playground' });
  });

  it('use-cases route を解決する', () => {
    expect(resolveAppRoute('/use-cases')).toEqual({ name: 'use-cases' });
  });

  it('削除済み vscode-editor route は not-found になる', () => {
    expect(resolveAppRoute('/vscode-editor')).toEqual({
      name: 'not-found',
      pathname: '/vscode-editor',
    });
  });
});

describe('resolveRawMarkdownRoute', () => {
  it('article markdown route を解決する', () => {
    expect(resolveRawMarkdownRoute('/articles/launch.md')).toEqual({
      kind: 'article',
      slug: 'launch',
    });
  });

  it('book markdown route を解決する', () => {
    expect(resolveRawMarkdownRoute('/books/core.md')).toEqual({
      kind: 'book',
      slug: 'core',
    });
  });

  it('chapter markdown route を解決する', () => {
    expect(resolveRawMarkdownRoute('/books/core/intro.md')).toEqual({
      kind: 'chapter',
      bookSlug: 'core',
      chapterSlug: 'intro',
    });
  });

  it('通常の表示 route には反応しない', () => {
    expect(resolveRawMarkdownRoute('/articles/launch')).toBeNull();
    expect(resolveRawMarkdownRoute('/books/core/intro')).toBeNull();
    expect(resolveRawMarkdownRoute('/search')).toBeNull();
  });
});

describe('publication section helpers', () => {
  const summaries: PublicationSummary[] = [
    {
      id: 'book-papyr-docs',
      title: 'Papyr の公式 docs site',
      kind: 'book',
      section: 'use-case',
      slug: 'papyr-docs',
      summary: 'use case',
      published: true,
      topics: [],
    },
    {
      id: 'book-core',
      title: '@f12o/papyr-core',
      kind: 'book',
      section: 'package',
      slug: 'core',
      summary: 'package',
      published: true,
      topics: [],
    },
    {
      id: 'article-launch',
      title: 'Launch',
      kind: 'article',
      section: 'article',
      slug: 'launch',
      summary: 'article',
      published: true,
      topics: [],
    },
  ];

  it('section filter で use-case のみ返す', () => {
    expect(
      filterPublicationSummaries(summaries, { section: 'use-case' }).map((item) => item.id),
    ).toEqual(['book-papyr-docs']);
  });

  it('section filter で package 以外を除外する', () => {
    expect(
      filterPublicationSummaries(summaries, { section: 'package' }).map((item) => item.id),
    ).toEqual(['book-core']);
  });

  it('searchHref は section を query param に含める', () => {
    expect(searchHref('papyr', 'use-case')).toBe('/search?q=papyr&section=use-case');
  });

  it('searchHref は all のとき section param を付けない', () => {
    expect(searchHref('papyr', 'all')).toBe('/search?q=papyr');
  });

  it('isPublicationSection は valid / invalid を判定する', () => {
    expect(isPublicationSection('getting-started')).toBe(true);
    expect(isPublicationSection('use-case')).toBe(true);
    expect(isPublicationSection('package')).toBe(true);
    expect(isPublicationSection('article')).toBe(true);
    expect(isPublicationSection('docs')).toBe(false);
    expect(isPublicationSection('')).toBe(false);
    expect(isPublicationSection(null)).toBe(false);
  });
});

describe('isLlmUserAgent', () => {
  it('主要 LLM クローラーの UA を true 判定する', () => {
    expect(isLlmUserAgent('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)')).toBe(
      true,
    );
    expect(isLlmUserAgent('ChatGPT-User/1.0')).toBe(true);
    expect(isLlmUserAgent('Mozilla/5.0 (compatible; OAI-SearchBot/1.0)')).toBe(true);
    expect(isLlmUserAgent('Mozilla/5.0 (compatible; ClaudeBot/1.0)')).toBe(true);
    expect(isLlmUserAgent('anthropic-ai/1.0')).toBe(true);
    expect(isLlmUserAgent('Claude-User/1.0')).toBe(true);
    expect(isLlmUserAgent('Mozilla/5.0 (compatible; PerplexityBot/1.0)')).toBe(true);
    expect(isLlmUserAgent('CCBot/2.0')).toBe(true);
    expect(isLlmUserAgent('meta-externalagent/1.1')).toBe(true);
    expect(
      isLlmUserAgent('Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)'),
    ).toBe(true);
    expect(isLlmUserAgent('cohere-ai/1.0')).toBe(true);
    expect(isLlmUserAgent('MistralAI-User/1.0')).toBe(true);
    expect(isLlmUserAgent('DuckAssistBot/1.0')).toBe(true);
    expect(isLlmUserAgent('Amazonbot/0.1')).toBe(true);
  });

  it('case insensitive にマッチする', () => {
    expect(isLlmUserAgent('gptbot/1.0')).toBe(true);
    expect(isLlmUserAgent('GPTBOT')).toBe(true);
  });

  it('通常ブラウザ UA は false を返す', () => {
    expect(
      isLlmUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isLlmUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(
      isLlmUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'),
    ).toBe(false);
  });

  it('Googlebot は除外する', () => {
    expect(
      isLlmUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'),
    ).toBe(false);
    expect(isLlmUserAgent('Mozilla/5.0 (compatible; Applebot/0.1)')).toBe(false);
  });

  it('null / 空文字 は false を返す', () => {
    expect(isLlmUserAgent(null)).toBe(false);
    expect(isLlmUserAgent(undefined)).toBe(false);
    expect(isLlmUserAgent('')).toBe(false);
  });
});

describe('resolveLlmRedirectTarget', () => {
  it('article ページを .md に変換する', () => {
    expect(resolveLlmRedirectTarget('/articles/launch')).toBe('/articles/launch.md');
  });

  it('book ページを .md に変換する', () => {
    expect(resolveLlmRedirectTarget('/books/core')).toBe('/books/core.md');
  });

  it('chapter ページを .md に変換する', () => {
    expect(resolveLlmRedirectTarget('/books/core/intro')).toBe('/books/core/intro.md');
  });

  it('trailing slash を許容する', () => {
    expect(resolveLlmRedirectTarget('/articles/launch/')).toBe('/articles/launch.md');
  });

  it('すでに .md で終わる URL は対象外', () => {
    expect(resolveLlmRedirectTarget('/articles/launch.md')).toBeNull();
    expect(resolveLlmRedirectTarget('/books/core/intro.md')).toBeNull();
  });

  it('トップ・一覧ページは対象外', () => {
    expect(resolveLlmRedirectTarget('/')).toBeNull();
    expect(resolveLlmRedirectTarget('/articles')).toBeNull();
    expect(resolveLlmRedirectTarget('/books')).toBeNull();
  });

  it('API・特殊ファイルは対象外', () => {
    expect(resolveLlmRedirectTarget('/api/publications')).toBeNull();
    expect(resolveLlmRedirectTarget('/llms.txt')).toBeNull();
    expect(resolveLlmRedirectTarget('/robots.txt')).toBeNull();
    expect(resolveLlmRedirectTarget('/sitemap.xml')).toBeNull();
  });

  it('未知のパスは対象外', () => {
    expect(resolveLlmRedirectTarget('/search')).toBeNull();
    expect(resolveLlmRedirectTarget('/playground')).toBeNull();
    expect(resolveLlmRedirectTarget('/articles/foo/bar/baz')).toBeNull();
  });

  it('dot segment を含む path は対象外', () => {
    expect(resolveLlmRedirectTarget('/books/../etc')).toBeNull();
    expect(resolveLlmRedirectTarget('/books/%2E%2E/etc')).toBeNull();
    expect(resolveLlmRedirectTarget('/articles/.')).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('HTML 特殊文字をエスケープする', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml("It's a & <test>")).toBe('It&#39;s a &amp; &lt;test&gt;');
  });

  it('通常の文字列はそのまま返す', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
