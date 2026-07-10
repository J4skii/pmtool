# Pull Request

## Summary

<!-- What does this PR change and why? Link the issue if one exists. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behavior change)
- [ ] Database schema / migration
- [ ] Documentation
- [ ] CI/CD or tooling

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes (new/changed code has tests)
- [ ] Prisma migration included if `schema.prisma` changed
- [ ] All queries on tenant-scoped tables filter by `tenantId`
- [ ] New endpoints validate input with shared Zod schemas and check permissions
- [ ] No secrets, credentials, or `.env` values committed
- [ ] Docs updated (`README.md` / `docs/`) if behavior or setup changed

## Screenshots / recordings

<!-- For UI changes. Delete if not applicable. -->

## Notes for reviewers

<!-- Anything reviewers should focus on, known limitations, follow-ups. -->
