# CI DEVELOPMENT RULE

GitHub Actions CI is a quality gate for DREAMMATE.

Before creating a feature commit:

1. Run the relevant local tests.
2. Run linting.
3. Run TypeScript/type checks.
4. Run the production build when frontend code changes.
5. Inspect git diff.
6. Confirm no secrets or generated files are staged.
7. Commit only after the checks pass.

After pushing to GitHub:

1. Monitor the GitHub Actions workflow.
2. If CI fails, investigate and fix the underlying problem.
3. Do not disable checks.
4. Do not use `continue-on-error`.
5. Do not use `|| true` to hide failures.
6. Do not weaken tests just to obtain a green build.

A green CI result must represent a genuinely healthy repository.

When a CI failure is caused by the current change, fix it before beginning the next major feature.

For unrelated pre-existing CI failures, document them clearly rather than hiding them.

Maintain logical commits such as:
- chore: add github actions CI
- feat: implement expressive avatar system
- feat: add memory consolidation
- feat: improve accountability workflow
- fix: resolve avatar emotion rendering
- test: add memory consolidation tests
