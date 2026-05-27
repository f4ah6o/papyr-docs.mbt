import type { AppRoute } from '../../shared.js';
import { escapeHtml } from '../../shared.js';

interface PrimaryNavItem {
  label: string;
  href: string;
  isActive: (route: AppRoute, hash: string) => boolean;
}

const GLOBAL_PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    label: 'ホーム',
    href: '/',
    isActive: (route, hash) => route.name === 'home' && !hash,
  },
  {
    label: 'Use Cases',
    href: '/use-cases',
    isActive: (route) => route.name === 'use-cases',
  },
  {
    label: 'Docs',
    href: '/books',
    isActive: (route) =>
      route.name === 'books' || route.name === 'book' || route.name === 'chapter',
  },
  {
    label: 'Updates',
    href: '/articles',
    isActive: (route) => route.name === 'articles' || route.name === 'article',
  },
  {
    label: 'Design',
    href: '/design-system',
    isActive: (route) => route.name === 'design-system',
  },
  {
    label: '試してみる',
    href: '/playground',
    isActive: (route) => route.name === 'playground' || route.name === 'advanced-playground',
  },
];

export function renderPrimaryNav(route: AppRoute, hash: string): string {
  return GLOBAL_PRIMARY_NAV_ITEMS.map((item) => {
    const active = item.isActive(route, hash);
    return `<a data-link href="${item.href}" class="${active ? 'active' : ''}">${item.label}</a>`;
  }).join('');
}

export interface ShellOptions {
  immersive?: boolean;
  hash?: string;
}

export function renderShell(route: AppRoute, content: string, options: ShellOptions = {}): string {
  const hash = options.hash ?? '';
  const searchQuery = route.name === 'search' ? route.query : '';
  const shellClass = options.immersive ? 'site-shell site-shell--immersive' : 'site-shell';
  const mainClass = options.immersive ? 'site-main site-main--immersive' : 'site-main';
  return `
    <div class="${shellClass}">
      <header class="site-header">
        <div class="site-header__top">
          <a class="brand" data-link href="/">
            <span class="brand__mark">P</span>
            <span>
              <strong>Papyr</strong>
              <small>docs</small>
            </span>
          </a>
          <form id="site-search-form" class="site-search" role="search">
            <input name="q" type="search" placeholder="検索" value="${escapeHtml(searchQuery)}" />
            <span class="site-search__hint" aria-hidden="true">/</span>
          </form>
        </div>
        <div class="site-header__bottom">
          <nav class="site-nav" aria-label="Primary">${renderPrimaryNav(route, hash)}</nav>
        </div>
      </header>
      <main id="page" class="${mainClass}">${content}</main>
      ${
        options.immersive
          ? ''
          : `<footer class="site-footer">
              <div>
                <strong>Papyr docs</strong>
                <p>Markdown source と構造化 document を同じ導線で読めるように設計しています。</p>
              </div>
              <nav class="site-footer__links" aria-label="Footer">
                <a data-link href="/books">Docs</a>
                <a data-link href="/articles">Updates</a>
                <a data-link href="/use-cases">Use Cases</a>
                <a data-link href="/playground">Playground</a>
              </nav>
            </footer>`
      }
    </div>
  `;
}
