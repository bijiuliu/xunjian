<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guardrails

- Keep the approved stack: Next.js 16 App Router, React, TypeScript, Tailwind CSS, local shadcn/ui-style components, Framer Motion, Lucide, Sonner, localStorage, and the PWA manifest.
- Do not introduce a second UI system or a full UI library. Reuse or extend `src/components/ui` before creating one-off controls.
- Preserve the mobile iOS-inspired visual language and consume tokens from `src/app/globals.css`; do not add isolated color, radius, or shadow scales.
- Use Lucide React for functional icons. Do not use emoji as a replacement for a functional icon.
- Preserve existing localStorage keys and data compatibility. Do not alter unrelated inspection rules or flows.
- Before changing Next.js code, read the relevant documentation under `node_modules/next/dist/docs/` and heed version-specific guidance.
- Before adding a dependency, explain its need, scope, benefit, and the lighter alternative. Add it only when the benefit is concrete.
- For material UI or architecture changes, state the expected impact before implementation.
- After code changes, run `npm run lint`, `npx tsc --noEmit`, and a production build. Run relevant core-flow tests when they exist.
- Prefer small, reviewable changes. Keep touch targets at least 44px where practical and preserve Safe Area behavior.
