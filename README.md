# Hook Atlas

A static React/Vite Hook Atlas for reviewing, mapping, and presenting short-form creative hooks.

## Local Preview

```bash
pnpm install
pnpm run dev
```

Open:

```text
http://localhost:5173/?view=atlas
```

## GitHub Pages Sharing

This repo can be shared through GitHub Pages from a `gh-pages` branch.

The deployment intentionally keeps the shared site small:

- GitHub Pages serves the built React app shell from `gh-pages`.
- GIFs and videos load from the repo through `raw.githubusercontent.com`.
- Media files remain in `public/media`.

After pushing, enable `Settings -> Pages -> Build and deployment -> Deploy from a branch`, then choose `gh-pages` and `/root`.

Expected share URL:

```text
https://YOUR_USERNAME.github.io/REPO_NAME/?view=atlas
```

More detail: `docs/github-pages-deploy.md`.
