'use client';

import { DocsNav, DocsToc, useActiveSection } from '@/components/DocsNav';
import { DocsContent, DOC_TOC_ENTRIES, DOC_SECTION_IDS } from '@/components/DocsContent';

export function DocsPageClient() {
  const sectionIds = DOC_SECTION_IDS as unknown as string[];
  const { activeId, scrollTo } = useActiveSection(sectionIds);

  return (
    /*
     * docs-root: flex row
     *   ├── docs-sidebar  (sticky, full-height, 268 px wide)
     *   ├── docs-main     (flex: 1, scrolls naturally)
     *   │     └── DocsContent
     *   └── docs-toc-panel (sticky, visible ≥ 1300 px)
     */
    <div className="docs-root">
      {/* ── Left sidebar ─────────────────────────────────── */}
      <DocsNav activeId={activeId} onNavClick={scrollTo} />

      {/* ── Scrollable content ───────────────────────────── */}
      <main className="docs-main" id="docs-main-content">
        <DocsContent />
      </main>

      {/* ── Right on-page TOC (wide screens only) ────────── */}
      <DocsToc
        entries={DOC_TOC_ENTRIES as unknown as { id: string; label: string }[]}
        activeId={activeId}
        onTocClick={scrollTo}
      />
    </div>
  );
}
