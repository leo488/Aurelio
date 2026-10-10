# Aurelio

Mobile-first PWA for Leo and Soniya. Vite + React + TypeScript, React Router, Zustand, vite-plugin-pwa.
Design source: `design_handoff_aurelio_pwa/` (the prototype HTML wins on any visual conflict).

```sh
npm install
npm run dev       # local dev server
npm run build     # type-check + production build with service worker
npm run preview   # serve the build (install/offline testing)
npm test          # vitest
npm run lint      # oxlint
npm run icons     # regenerate PWA icons from the app mark
```

- `src/styles/tokens.css`: colours, gradients, radii, spacing, keyframes.
- `src/App.tsx`: one route per screen; placeholders are replaced screen by screen.
- `scripts/gen-icons.mjs`: writes `public/favicon.svg` and `public/icons/*`.

Install and offline only work over HTTPS (or localhost), so test on a phone through a deployed preview.
