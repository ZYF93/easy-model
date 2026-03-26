# Project Guidelines

## Code Style

TypeScript strict mode, no `any` types. Class names domain-focused (e.g., `UserModel`). Use `provide()` for instance management. Path aliases: `@/*` for `src/*`, `@@/*` for root.

## Architecture

Model classes encapsulate state and logic with IoC injection. Deep reactive watching with Proxy. React integration via hooks. Boundaries: models (business), pages (UI composition), components (pure UI), services (external).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Build and Test

- Install: `pnpm install`
- Dev: `pnpm dev` (runs Vite dev server with hot-reloading)
- Build: `pnpm build` (library build + TypeScript declarations)
- Test: `pnpm test` (Vitest)
- Test with coverage: `pnpm test:coverage`
- Lint scripts: `pnpm lint:scripts` (ESLint with autofix)
- Lint styles: `pnpm lint:styles` (Stylelint)
- Format: `pnpm format` (Prettier)

## Conventions

Use watch paths as arrays (`['obj', 'field']`). Inject dependencies with `@inject` decorator and Zod schemas. Loaders for async methods. `offWatch` for performance.

See [docs/GUIDE.md](docs/GUIDE.md) for patterns.

## Async Patterns

Use `@loader.load` decorator on async methods for loading state tracking. Query loading states with `useLoader().isLoading(model.method)` in components.

## Performance

Decorate non-reactive fields with `@offWatch` to exclude from observation. Prioritize component design over excessive `useCallback`/`useMemo`.

## React Integration

- `useModel`: Creates/injects model instances. Can also share instances when same args are used (internally calls useInstance).
- `useInstance`: Subscribes to existing model instances.
- `useWatcher`: Component-side effects with auto-cleanup.
- `useLoader`: Access loading states for async methods.

**Note**: Both can share instances. `useModel(ModelClass, [args])` with the same args automatically returns the same instance across components. It's a convenience wrapper around `useInstance`.

## Testing

Use Vitest with jsdom environment. Test provide caching, IoC injection, watchers, and loaders. Ensure cleanup in test setup.

## Common Pitfalls

- Components don't update if not using `useModel`/`useInstance` or if destructuring model fields.
- Always access model fields via instance; modify observed fields directly.
- Use `useWatcher` for component effects; `watch` for global (requires manual `stop`).
- Ensure `react` and `zod` are externals in Vite config for library builds.
