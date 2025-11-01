# Migrating away from @esbuild-kit

This repository has transient dependencies on `@esbuild-kit/esm-loader` and `@esbuild-kit/core-utils` (brought in by older tooling). These packages are deprecated and can produce warnings during install/build.

What I changed for you

- Ensured `tsx` is installed and available in `devDependencies`.
- Added explicit `npm` scripts that run the server via `tsx`:
  - `npm run dev:server` — starts server in development with tsx
  - `npm run start:tsx` — runs the built server with tsx in production

How to fully remove @esbuild-kit packages (recommended)

1. Update direct dependencies that pull the deprecated packages. Run locally:

   # prefer npm
   npm update

   This updates transitive deps and may remove @esbuild-kit from the lockfile.

2. If your CI enforces frozen lockfiles, update the lockfile and commit it:

   npm install
   git add package-lock.json package.json
   git commit -m "chore: update lockfile to remove deprecated esbuild-kit deps"

3. If some package still depends on @esbuild-kit, identify it with:

   npm ls @esbuild-kit/esm-loader
   npm ls @esbuild-kit/core-utils

   Then either:
   - Upgrade or replace that package with a maintained alternative, or
   - Open an issue with the package author requesting they remove the deprecated dependency.

Notes

   - I did not modify lockfiles here to avoid causing CI/frozen-lockfile issues. If you want, I can update lockfiles and commit them for you (tell me to run `npm install` and commit the updated lockfile).
- The new `tsx`-based scripts allow you to run TypeScript/Esm server code without relying on esbuild-loader machinery.
