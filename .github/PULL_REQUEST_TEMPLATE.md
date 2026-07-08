## What

<!-- One paragraph: what changes and why. Link the issue if one exists. -->

## Checklist

- [ ] `npm run check` passes (typecheck + lint + format + tests)
- [ ] New behavior has tests — fixtures for provider changes, compliance/integration for surface changes
- [ ] No provider-specific logic outside `src/providers/<id>/`
- [ ] Everything stays read-only
- [ ] Docs updated where relevant (README table, docs/tools.md, .env.example)

## For new providers only

- [ ] Followed [docs/adding-providers.md](../docs/adding-providers.md) end to end
- [ ] Recorded fixtures under `tests/fixtures/<id>/` (no network in tests)
- [ ] `metadata()` states attribution and terms
