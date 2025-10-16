# Publishing Workflow

## 1. Pre-publish checklist

1. **Run tests** (add once test suite exists)
   ```bash
   npm test
   ```
2. **Build artifacts** if using a bundler (none configured yet)
3. **Update version** in `package.json`
4. **Commit changes** and ensure a clean git status

## 2. Authenticate with npm registry

```bash
npm login
```

## 3. Dry run (optional but recommended)

```bash
npm publish --dry-run
```

## 4. Publish to npm

```bash
npm publish --access public
```

If publishing a scoped package (e.g., `@saku/peq-10band`), include `--access public` on the first publish.

## 5. Tag in git

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 6. Consumers install the library

```bash
npm install @saku/peq-10band
```

## Notes
- Add build tooling (Rollup, TypeScript types) before release if desired
- Update the README with change history for future versions
