# Releasing — web-admin

A static Vite build. **The deploy target is not recorded in this repo** — there is no
`vercel.json`, `netlify.toml`, `Dockerfile`, or CI deploy workflow here, and `package.json` is
still at version `0.0.0`.

> **Fill this in.** Whoever knows where this portal is actually hosted should replace the
> "Deploy" section below with the real steps. Until then, treat the build + gates as the
> reliable part and the deploy as tribal knowledge — which is exactly the gap this doc exists
> to close.

---

## Build

```bash
npm run build      # vite build → dist/
npm run preview    # serve dist/ locally to sanity-check the production bundle
```

`dist/` is committed in this repo, so a stale `dist/` can ship old code — rebuild before
releasing and check the diff is what you expect.

## Release gates

```bash
npm run lint
npm test           # vitest run
npm run test:e2e   # playwright
npm run build
```
- [ ] All four green.
- [ ] [`CHANGES.md`](../CHANGES.md) has entries since the last release.
- [ ] Every touched module's [`modules/*.md`](../modules/) doc + [`TESTING_GUIDE.md`](../TESTING_GUIDE.md) updated.
- [ ] **Role scoping re-checked** for any page you touched — a manager must not be able to see
      another manager's resources. Confirm the backend enforces it; don't rely on the UI.
- [ ] Any backend contract change is reflected in the matching
      [`backend/docs/modules/*.md`](../../../backend/docs/modules/).
- [ ] Env/config (API base URL, map keys) correct for the target environment.

## Deploy

> **Unknown — to be documented.** Record here: the host, how a build gets there (CI? manual
> upload? `dist/` served from somewhere?), the environment variables it needs, and how to roll
> back. Also set a real version in `package.json` (currently `0.0.0`) so releases are
> identifiable.

## Version + record

1. Set a real semver in `package.json`.
2. Roll `CHANGES.md` entries into [`CHANGELOG.md`](../../CHANGELOG.md).
3. Tag:
   ```bash
   git tag -a v<version> -m "web-admin v<version>"
   git push origin v<version>
   ```
4. Sync the submodule pointer in the umbrella repo.
