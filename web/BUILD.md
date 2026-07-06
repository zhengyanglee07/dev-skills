# Building the Spaces preview UI

The React app source lives in `web/`. The runtime UI lives in `preview/` (this folder is the **Vite build output** — the Python script `scripts/preview.py` serves it as static files).

## Develop

```bash
cd web
pnpm install            # one-time
pnpm dev                # start Vite dev server on http://localhost:5173
```

In dev mode, API calls to `/api/*` are proxied to the running Python server (port 8765 by default). Start the Python server first if you want live data:

```bash
python ../scripts/preview.py /path/to/Spaces
```

Then in another terminal, `pnpm dev` — Vite picks up HMR automatically.

## Build

```bash
cd web
pnpm build
```

This runs `tsc -b` (typecheck) and then `vite build`, which outputs to `../preview/`:

```
preview/
  index.html
  assets/
    index-[hash].js
    index-[hash].css
```

These are the files the Python server serves. The build is what ships with the skill — users never need to run `pnpm install` or `pnpm build` themselves; they just run `python scripts/preview.py <spaces-path>`.

## Adding a new dependency

```bash
cd web
pnpm add <package>            # production dep
pnpm add -D <package>         # dev dep
pnpm build                    # rebuild to ../preview/
```

After rebuild, commit both `web/package.json` and `preview/` (the new hash means the old build is replaced atomically).
