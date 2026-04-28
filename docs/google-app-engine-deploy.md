# Google App Engine Deploy

This project can be published as a static App Engine app from the generated `dist/` folder.

## What Works

- The Atlas, Inspiration, and Builder views are static React/Vite pages.
- The seeded validation decisions are bundled into the build.
- Review decisions still save in each viewer's browser local storage.
- View URLs such as `?view=atlas`, `?view=inspiration`, and `?hook=curiosity-gap` work.

## Current Caveat

The media library is large: about 1.5GB, with several GIF files over 30MB. App Engine static uploads may reject very large files or make deployment slow. For a polished share link, the clean Google-native setup is:

- App Engine for the React app.
- Cloud Storage or Firebase Hosting for large GIF/MP4 media.
- MP4/WebM versions of GIFs where possible.

## One-Time Setup On The Deployment Device

1. Install the Google Cloud CLI.
2. Sign in:

   ```bash
   gcloud auth login
   ```

3. Select or create the project:

   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. Enable App Engine if the project does not have it yet:

   ```bash
   gcloud app create
   ```

## Deploy

From the project folder:

```bash
node .tools/pnpm/bin/pnpm.cjs run build
gcloud app deploy app.yaml
```

After deployment:

```bash
gcloud app browse
```

The share URL will usually look like:

```text
https://YOUR_PROJECT_ID.REGION_ID.r.appspot.com/?view=atlas
```

## If Upload Fails Because Of Media Size

Use this order of fixes:

1. Convert the largest GIFs to MP4/WebM and update their `sourcePath` in `src/data.ts`.
2. Move `/media/references/*` to a Google Cloud Storage bucket and replace local paths with public `https://storage.googleapis.com/...` URLs.
3. Deploy the app shell only to App Engine.
