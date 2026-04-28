# GitHub Pages Deploy

This can be shared through GitHub Pages as a static website. It does not need to be an app/server as long as review decisions can remain local/exportable.

## Best Fit

- Manager review link.
- Static Atlas, Inspiration, and Builder views.
- Seeded validation decisions.
- Shareable URLs like `?view=atlas` and `?hook=curiosity-gap`.

## Important Limit

The current media library is about 1.5GB because the GIF library is large. GitHub has a 100MB per-file limit and GitHub Pages is not ideal for sites over about 1GB. There are no files over 100MB right now, but the total media library is still heavy.

The deployment uses a safer split route:

- GitHub Pages hosts the small built React app shell from a `gh-pages` branch.
- Media loads from the main repository through `raw.githubusercontent.com`.
- The public site branch stays small instead of trying to upload the full GIF library into Pages.

Do not use Git LFS for this temporary route. The live site expects the media files to be available as normal raw GitHub files.

If GitHub raw media feels slow, use GitHub for the app and move media to Google Cloud Storage, Cloudflare R2, or another static asset host.

## Setup

1. Create a GitHub repository.
2. Push this project to `main`.
3. Build the app with the GitHub Pages base path and media URL.
4. Push the generated `dist/` files to a `gh-pages` branch.
5. In GitHub, go to `Settings -> Pages`.
6. Under `Build and deployment`, choose `Deploy from a branch`.
7. Select `gh-pages` and `/root`.

If you already have an empty GitHub repo URL, the local push flow is:

```bash
git init
git branch -M main
git add .
git commit -m "Deploy hook atlas"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

## Expected URL

For a normal project repo:

```text
https://YOUR_USERNAME.github.io/REPO_NAME/?view=atlas
```

For a user/organization Pages repo named `YOUR_USERNAME.github.io`:

```text
https://YOUR_USERNAME.github.io/?view=atlas
```
