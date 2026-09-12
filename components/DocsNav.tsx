'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Zap,
  GitBranch,
  Shield,
  Code2,
  HelpCircle,
  FileCode,
  Search,
  LifeBuoy,
  ChevronRight,
} from 'lucide-react';
import { BeamMark } from './BeamMark';

/* ── Nav tree ──────────────────────────────────────────────────────────── */
export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Getting Started',
    items: [
      { id: 'overview',    label: 'Overview',      icon: <BookOpen  size={14} /> },
      { id: 'quick-start', label: 'Quick Start',   icon: <Zap       size={14} />, badge: '5 min' },
      { id: 'how-it-works',label: 'How It Works',  icon: <GitBranch size={14} /> },
    ],
  },
  {
    label: 'Protocol',
    items: [
      { id: 'smart-contract', label: 'Smart Contract', icon: <FileCode size={14} /> },
      { id: 'security',       label: 'Security',       icon: <Shield  size={14} /> },
      { id: 'relayer',        label: 'Relayer',         icon: <Code2   size={14} /> },
    ],
  },
  {
    label: 'Reference',
    items: [
      { id: 'api-reference', label: 'API Reference', icon: <Code2      size={14} />, badge: 'REST' },
      { id: 'faq',           label: 'FAQ',           icon: <HelpCircle size={14} /> },
      { id: 'support',       label: 'Support',       icon: <LifeBuoy   size={14} /> },
    ],
  },
];

/* ── Component ─────────────────────────────────────────────────────────── */
interface DocsNavProps {
  /** The section id currently in the viewport (lifted from IntersectionObserver in the content area) */
  activeId: string;
  onNavClick: (id: string) => void;
}

export function DocsNav({ activeId, onNavClick }: DocsNavProps) {
  const [query, setQuery] = useState('');

  const filtered: NavGroup[] = query.trim()
    ? NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i =>
          i.label.toLowerCase().includes(query.toLowerCase()),
        ),
      })).filter(g => g.items.length > 0)
    : NAV_GROUPS;

  return (
    <aside className="docs-sidebar" aria-label="Documentation navigation">
      {/* Wordmark */}
      <Link href="/" className="docs-sidebar-logo">
        <BeamMark />
        beam
        <span className="docs-sidebar-version">docs</span>
      </Link>

      {/* Search */}
      <div className="docs-search" role="search">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search docs…"
          aria-label="Search documentation"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Nav groups */}
      <nav className="docs-nav" aria-label="Docs sections">
        {filtered.map(group => (
          <div key={group.label} className="docs-nav-group">
            <span className="docs-nav-group-label">{group.label}</span>
            {group.items.map(item => (
              <button
                key={item.id}
                type="button"
                className={`docs-nav-link${activeId === item.id ? ' active' : ''}`}
                onClick={() => onNavClick(item.id)}
                aria-current={activeId === item.id ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
                {item.badge && (
                  <span className="docs-nav-badge">{item.badge}</span>
                )}
                {activeId === item.id && (
                  <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.45 }} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* ── On-page TOC ───────────────────────────────────────────────────────── */
export interface TocEntry {
  id: string;
  label: string;
  depth?: 1 | 2;
}

interface DocsTocProps {
  entries: TocEntry[];
  activeId: string;
  onTocClick: (id: string) => void;
}

export function DocsToc({ entries, activeId, onTocClick }: DocsTocProps) {
  return (
    <aside className="docs-toc-panel" aria-label="On this page">
      <span className="docs-toc-label">On this page</span>
      {entries.map(e => (
        <button
          key={e.id}
          type="button"
          className={`docs-toc-link${activeId === e.id ? ' active' : ''}`}
          style={e.depth === 2 ? { paddingLeft: '22px', fontSize: '11px' } : undefined}
          onClick={() => onTocClick(e.id)}
          aria-current={activeId === e.id ? 'true' : undefined}
        >
          {e.label}
        </button>
      ))}
    </aside>
  );
}

/* ── Shared hook: IntersectionObserver-based active section tracker ────── */
export function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    const options: IntersectionObserverInit = {
      rootMargin: '-94px 0px -55% 0px',
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length > 0) {
        // Pick the topmost visible entry
        visible.sort(
          (a, b) =>
            (a.target as HTMLElement).offsetTop -
            (b.target as HTMLElement).offsetTop,
        );
        setActiveId(visible[0].target.id);
      }
    }, options);

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sectionIds]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return { activeId, scrollTo };
}
