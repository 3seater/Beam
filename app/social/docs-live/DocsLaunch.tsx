'use client';

import { BeamMark } from '@/components/BeamMark';
import { SectionOverview } from '@/components/DocsContent';
import { DocsNav } from '@/components/DocsNav';
import { ArrowUpRight } from 'lucide-react';

export function DocsLaunch() {
  return <main className="docs-launch-page">
    <article className="docs-launch-canvas" aria-label="Beam documentation launch graphic">
      <div className="docs-launch-curves" aria-hidden="true"><i /><i /><i /></div>
      <div className="docs-launch-brand"><BeamMark /><span>beam</span></div>
      <div className="docs-launch-heading"><h1>Docs<br />are live.</h1></div>
      <div className="docs-launch-addresses">
        <a href="https://x.com/use_beam">@use_beam</a>
        <a href="https://usebe.am">usebe.am <ArrowUpRight size={22} /></a>
      </div>
      <div className="docs-launch-window">
        <div className="docs-launch-window-bar"><BeamMark /><span>usebe.am/docs</span><ArrowUpRight size={18} /></div>
        <div className="docs-launch-document">
          <DocsNav activeId="overview" onNavClick={id => { window.location.href = `/docs#${id}`; }} />
          <div className="docs-content"><SectionOverview /></div>
        </div>
      </div>
    </article>
  </main>;
}
