# Project Guidelines

## Code Style

TypeScript strict mode, no `any` types. Class names domain-focused (e.g., `UserModel`). Use `provide()` for instance management. Path aliases: `@/*` for `src/*`, `@@/*` for root.

## Architecture

Model classes encapsulate state and logic with IoC injection. Deep reactive watching with Proxy. React integration via hooks. Boundaries: models (business), pages (UI composition), components (pure UI), services (external).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Build and Test

- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint:scripts`
- Format: `pnpm format`

## Conventions

Use watch paths as arrays (`['obj', 'field']`). Inject dependencies with `@inject` decorator and Zod schemas. Loaders for async methods. `offWatch` for performance.

See [docs/GUIDE.md](docs/GUIDE.md) for patterns.
