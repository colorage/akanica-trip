# Akanica Trip

A single-page scroll photo gallery for trip memories. Each trip opens with a fullscreen cover (title + date), followed by a masonry photo grid. Tap or click any photo to zoom with PhotoSwipe.

## Edit trip titles

Update [`src/data/trips.json`](src/data/trips.json) with your trip names and dates. Photo paths are derived from the `folder` field, which must match a directory under `public/photos/`.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:4321/akanica-trip/](http://localhost:4321/akanica-trip/).

## Build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Push this repo to GitHub (repo name: `akanica-trip`).
2. In repo **Settings → Pages**, set source to **GitHub Actions**.
3. Push to `main` — the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys automatically.

If you use a user site repo (`username.github.io`), change `base` in [`astro.config.mjs`](astro.config.mjs) to `'/'`.

## Photo structure

Each trip folder in `public/photos/` should contain:

- `cover.jpeg` — fullscreen cover image
- `photo_1.jpeg` … `photo_10.jpeg` — gallery photos
