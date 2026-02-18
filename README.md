# Lava Lamp Interior (WebGL + Vite + TypeScript)

A fullscreen, dark, hypnotic lava-lamp-style interior using a fragment shader with metaballs, domain warping, soft glow, and internal shading.

## Local run

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Build

```bash
npm run build
npm run preview
```

## Customization knobs

Edit `src/main.ts` in the `config` object:

- `blobCount`: Number of big blobs (`6` to `12` works best).
- `speed`: Overall motion speed (smaller = slower/more relaxing).
- `blobRadiusMin` / `blobRadiusMax`: Blob size range.
- `threshold`: Merge/split behavior (higher usually means tighter lava regions).
- `glowStrength`: Edge glow intensity.
- `orangeColorA` / `orangeColorB`: Lava color gradient.
- `backgroundColor`: Near-black background tone.

## GitHub Pages deployment

1. `vite.config.ts` reads `VITE_BASE_PATH` and automatically normalizes to `/<REPO_NAME>/` when provided.
2. `.github/workflows/deploy.yml` sets:

```yaml
VITE_BASE_PATH: ${{ github.event.repository.name }}
```

So no manual repo-name edits are required for CI deploy.

3. Commit and push to `main`.
4. In GitHub repo settings:
   - Go to **Settings -> Pages**.
   - Set **Source** to **GitHub Actions**.
5. The workflow at `.github/workflows/deploy.yml` builds and deploys `dist` automatically on push to `main`.

## Notes

- Uses plain WebGL (no heavy graphics libraries).
- Handles resize and device pixel ratio (DPR is capped to 2 for stable performance).
- Animation runs continuously with `requestAnimationFrame`.
