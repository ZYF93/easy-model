# AGENTS.md - Agent Guidelines for easy-model

This file provides guidelines for agentic coding agents operating in this repository.

---

## 1. Build, Lint, and Test Commands

### Installation

```bash
pnpm install  # or npm install
```

### Development

```bash
pnpm dev          # Runs Vite dev server with hot-reloading
```

### Building

```bash
pnpm build        # Full build: library build + TypeScript declarations
pnpm build:lib    # Build library only (removes dist, runs tsc + vite build)
pnpm build:dts    # Generate TypeScript declarations
```

### Testing

```bash
pnpm test               # Run all tests (Vitest in watch mode by default)
pnpm test -- run        # Run tests once (not in watch mode)
pnpm test -- run <file> # Run a single test file
pnpm test -- run -t <pattern>  # Run tests matching a pattern
pnpm test:coverage      # Run tests with coverage report
```

### Linting and Formatting

```bash
pnpm lint:scripts       # ESLint with autofix (.ts files)
pnpm lint:styles        # Stylelint for CSS/SCSS
pnpm format:scripts     # Prettier format (.ts files)
pnpm format:styles      # Prettier format CSS/SCSS
pnpm format             # Format all scripts and styles
```

---

## 2. Code Style Guidelines

### TypeScript Configuration

- **Strict mode enabled** - no `any` types allowed
- Use explicit types for function parameters and return values
- Path aliases: `@/*` maps to `src/*`, `@@/*` maps to root

### Naming Conventions

- **Model classes**: Domain-focused names (e.g., `UserModel`, `OrderModel`, `DashboardModel`)
- **Files**: PascalCase for classes, kebab-case otherwise
- **Variables/camelCase**: Use descriptive names
- **Constants**: UPPER_SNAKE_CASE

### Imports and Exports

- Use path aliases: `import { UserModel } from '@/models/user'`
- Group imports: external → internal → relative
- Use named exports for model classes and utilities
- Use barrel files (`index.ts`) for clean import paths

### Formatting

- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas
- Prettier handles formatting - run `pnpm format` before committing

### Error Handling

- Use try-catch for async operations
- Return typed results or use result objects
- Never use `any` type - use `unknown` if type is uncertain
- Prefer explicit error types over generic errors

### ESLint Rules

- `@typescript-eslint/no-explicit-any`: Error (except rest args)
- `@typescript-eslint/no-unused-vars`: Error (prefix unused with `_`)
- `prettier/prettier`: Error
- `autofix/no-debugger`: Error

---

## 3. Architecture Guidelines

### Project Structure

```
src/
  models/        # Business models (easy-model core)
  pages/         # Page-level components
  components/    # Reusable UI components
  services/      # API/external integrations
  hooks/         # Custom React hooks
  utils/         # Utility functions
```

### Layer Dependencies

```
services → models → pages → components
```

- **models**: Core business logic and state (easy-model)
- **pages**: UI composition, route handling
- **components**: Pure UI, business-agnostic
- **services**: External APIs, HTTP clients

### Model Design Principles

- Keep models focused on single domain
- Expose semantic methods (e.g., `loadList`, `applyFilter`)
- Use `@loader.load` decorator for async methods
- Use `@offWatch` for non-reactive fields (performance)
- Use `@inject` for dependency injection

### React Integration Patterns

- `useModel(ModelClass, [...args])`: Create/inject model instance
- `useInstance(ModelClass)`: Subscribe to existing instance
- `useWatcher(fn)`: Component-side effects with auto-cleanup
- `useLoader()`: Access loading states for async methods

---

## 4. Common Pitfalls

### React Updates

- **DO**: Use `useModel`/`useInstance` to access models
- **DO**: Access model fields via instance (e.g., `model.count`)
- **DON'T**: Destructure model fields (breaks reactivity)
- **DON'T**: Pass model methods directly to child components

### Watchers

- Use `useWatcher` for component effects (auto-cleanup)
- Use global `watch` for non-React contexts (requires manual `stop`)

### Async Patterns

- Decorate async methods with `@loader.load`
- Query loading states with `useLoader().isLoading(model.method)`

### Library Build Requirements

- Ensure `react` and `zod` are externals in Vite config

---

## 5. Testing Guidelines

### Test Framework

- Vitest with jsdom environment
- Test location: Same directory as source files with `.test.ts` suffix

### Test Patterns

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { provide, inject, watch, offWatch } from "@/index";

// Test provide caching
// Test IoC injection
// Test watchers and reactivity
// Test loaders and loading states
// Ensure cleanup in test setup (provide cleanup functions)
```

### Example Single Test Run

```bash
pnpm test -- run src/models/user.test.ts
pnpm test -- run -t "should load user"
```

---

## 6. Documentation References

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture and project structure
- [GUIDE.md](./docs/GUIDE.md) - Usage patterns and API reference
- [COOKBOOK.md](./docs/COOKBOOK.md) - Common recipes and examples

---

## 7. Pre-Commit Requirements

Before committing:

1. Run `pnpm format` to format code
2. Run `pnpm lint:scripts` to check for issues
3. Run `pnpm test -- run` to ensure tests pass
4. Ensure no `any` types or debugger statements
