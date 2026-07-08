# Contributing

Thanks for helping make humanitarian data more accessible to AI assistants.

## Getting started

```bash
git clone https://github.com/ahmedvnabil/humanitarian-mcp
cd humanitarian-mcp
npm install
npm run check        # typecheck + lint + format + tests must pass
```

## What we're looking for

1. **New providers** — ReliefWeb, HDX/HAPI, IDMC, World Bank, OWID.
   Follow [docs/adding-providers.md](docs/adding-providers.md) end to end;
   PRs without fixture-based tests won't be merged.
2. **Data-quality fixes** — normalization edge cases, better country aliases,
   centroid corrections.
3. **New tools/resources/prompts** — must be provider-agnostic, read-only,
   and covered by the compliance suite.
4. **Docs** — clearer examples, corrections, translations.

## Rules of the road

- **Read-only, always.** No tool may mutate external systems.
- **Provider isolation.** Provider-specific logic stays inside
  `src/providers/<id>/`.
- **No network in tests.** Record fixtures instead.
- **Respect the data's subjects.** These figures represent displaced people.
  Attribution (UNHCR et al.) is not optional; sensationalism is not welcome.
- **TypeScript strict, ESLint, Prettier** — `npm run lint:fix && npm run format`
  before committing.

## PR checklist

- [ ] `npm run check` passes
- [ ] New behavior has tests (unit for pure logic, compliance/integration for surface changes)
- [ ] Docs updated (README table, docs/tools.md, .env.example as applicable)
- [ ] Commit messages follow `type: description` (feat, fix, refactor, docs, test, chore)

## Reporting issues

Include the tool name, arguments, expected vs actual output, and — if data
looks wrong — a link to the corresponding view in the
[UNHCR Refugee Data Finder](https://www.unhcr.org/refugee-statistics/) so we
can tell a normalization bug from an upstream revision.
