# Beam graphics — approved design rules

Approved by Jacob on September 13, 2026, after reviewing the real HTML/SVG docs announcement. His response was “AMAZING,” followed by a request that future graphics follow this exact setup and design rules.

## Reference and source files

- Preview route: `/social/docs-live` (locally: `http://localhost:3000/social/docs-live`).
- Artboard composition: `app/social/docs-live/DocsLaunch.tsx`.
- Exact reference styling: `app/social/docs-live/poster.css`.
- Actual logo: `components/BeamMark.tsx`.
- Actual docs: `components/DocsContent.tsx`, `components/DocsNav.tsx`, and `app/docs/docs.css`.
- Site typography and palette: `app/globals.css` and `app/premium.css`.

Paths in this guide are relative to the repository root. The HTML docs artboard is the approved reference, **not** the earlier generated PNG in `output/social/beam-docs-live-v1.png`.

## Core approach

Build the graphic as real, editable HTML/CSS/SVG. Reuse the actual website logo, components, icons, fonts, product text, and assets. The product surface should visibly be Beam's real product. For a new subject, find its corresponding real component or page and compose it into the artwork.

Keep text selectable and SVG paths intact for browser screenshots and HTML-to-Figma capture. Avoid embedding the whole composition as a bitmap. Do not use image generation to recreate Beam's logo, typography, docs, or UI. Use image generation only when the user explicitly requests that medium or a separate illustration/photo that needs it.

## Visual language

- Clean iOS-style typography, light weights, generous negative space, restrained copy.
- Sky blue, icy cyan, and white. Primary brand colors: `#38A0E1`, `#79D6FC`, `#9BE7FD`.
- Bright daytime gradients; gentle oversized curved bands with very low contrast.
- Real white or pale-blue software surfaces. Thin white borders, subtle translucent rims, soft blue shadows, modest rounded corners.
- A flat, exact Beam SVG mark beside the lowercase `beam` wordmark. Keep the site's typography; do not substitute a generated or hand-redrawn logo.
- One dominant announcement and one real product view. Intentional cropping of the product at the outer artboard edges is welcome; keep the headline, logo, and account/domain fully visible.
- Modest rotation adds depth. Keep product text crisp. Avoid extreme perspective, heavy blur, neon glow, sparkles, floating decorative tokens unrelated to the announcement, and oversized sculptural logos.

## Approved 16:9 composition

The following values capture the approved setup. Use them as the starting template, then adjust only as needed for the subject or requested aspect ratio.

| Element | Approved specification |
| --- | --- |
| Canvas | 1600 × 900 px, clipped at its edges; scale the whole artboard for smaller previews |
| Background | `radial-gradient(ellipse at 95% 0%, #eafcff 0%, transparent 55%), linear-gradient(120deg, #38a0e1, #79d6fc 68%, #9be7fd)` |
| Decorative curves | Three oversized elliptical outlines; 95px borders in `#ffffff12`, cropped beyond the top/left edges; exact geometry in reference CSS |
| Brand position | Left 80px, top 67px; logo 56 × 56px; gap 10px |
| Wordmark | 49px, weight 450, tracking −2.8px, white |
| Main headline | Left 80px, top 260px; 138px, weight 300, line-height 1.02, tracking −8px; white; short deliberate line breaks |
| Identity labels | Left 80px, bottom 78px; 16px gap; `@use_beam` and `usebe.am` |
| Label style | 22px type, tracking −0.5px; 16px × 20px padding; 16px radius; white text; `#ffffff85` 1px border; `#ffffff16` fill |
| Product window | Left 656px, top 116px; 1000 × 930px; rotation −7deg; deliberately cropped at right/bottom |
| Product frame | 24px radius; 1px white border; `#f4f9fd` base; `-18px 30px 75px -24px #17639055, 0 0 0 7px #ffffff23` shadow |
| Window bar | 54px tall; actual Beam mark and relevant real page URL; pale background and thin divider |

The docs reference uses the real `DocsNav` and `SectionOverview` components. It preserves their actual headings, copy, navigation items, icons, and cards. Other announcements should use their own relevant real product components, not repeat docs content or invent a fake interface.

## Copy and identity

Use a short factual announcement such as “Docs are live.” Let the actual product view provide the detail. Keep any explanatory caption outside the artwork unless the user requests it inside.

Default identity is exactly `@use_beam` and `usebe.am`. Use the relevant actual URL in a product window, for example `usebe.am/docs`. Do not change the underscore or substitute an older domain.

Tone is direct and casual: sending crypto and stock tokens quickly and easily. Avoid cute gift-card language, sales jargon, exaggerated claims, filler microcopy, and unnecessary taglines. Pull factual product descriptions from the current source and verify them before publishing copy.

## Delivery workflow

1. Read this guide and inspect the approved artboard source before starting.
2. Choose the real product component(s) that match the announcement. Reuse shared sources where practical; avoid manually duplicating product text.
3. Create a separate `app/social/<announcement>/` route with scoped styling. Preserve the docs reference and avoid affecting other routes.
4. Keep the capture surface free of the global navbar, wallet controls, preloaders, toolbars, cursors, and debug overlays. Use public/demo content only; never render private links or wallet secrets into a graphic.
5. Default to a 1600 × 900 artboard for 16:9. Respect a different ratio requested by the user. Scale the composition uniformly instead of allowing responsive page styles to rearrange the artwork.
6. Verify in the browser at native size and a smaller preview. Check logo accuracy, real text, contrast, clipping, aspect ratio, and that all essential identity text stays visible.
7. Provide the preview URL and editable source location. State when the URL is localhost-only. For HTML-to-Figma, keep the content real HTML/SVG. Do not claim a public URL or export exists unless it has actually been produced.
8. Provide an image export when requested and available; otherwise the HTML artboard can be captured at its native dimensions. Do not publish or deploy solely because the user asked for a graphic.

## Future request shorthand

“Use the Beam graphics style” or “like the docs announcement” means follow this guide and the approved real HTML/SVG artboard. A fresh explicit creative direction takes precedence. Keep the same brand system while changing the headline and real product subject for each announcement.
