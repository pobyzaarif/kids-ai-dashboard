// Ambient declarations for global (non-module) CSS imports.
//
// Next.js only declares `*.module.css` in its bundled types (see
// `next/types/global.d.ts`) and relies on TypeScript not checking
// side-effect imports for `import "./globals.css"` to type-check.
// When side-effect imports are checked (TypeScript 5.6+ behavior, e.g.
// `noUncheckedSideEffectImports` in the editor's TS server), the import of
// `./globals.css` in `src/app/layout.tsx` reports:
//   "Cannot find module or type declarations for side-effect import of './globals.css'"
//
// This declaration makes global CSS imports resolve in that mode. It merges
// harmlessly with Next.js' own `*.module.css` declarations and does not affect
// bundling, which is handled by Tailwind CSS v4 / Next.js itself.

declare module "*.css";
