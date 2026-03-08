easy-model
==========

**easy-model** is a React state management and IoC toolkit built around **Model Classes + Dependency Injection + Fine‑grained change watching**. With plain TypeScript classes that describe your business models, a small set of APIs lets you:

- **Create / inject model instances directly in function components** (`useModel` / `useInstance`)
- **Share the same instance across components**, with instance caching grouped by arguments (`provide`)
- **Watch changes on models and their nested properties** (`watch` / `useWatcher`)
- **Use decorators and an IoC container for dependency injection** (`Container` / `CInjection` / `VInjection` / `inject`)
- **Manage async loading states in a unified way** (`loader` / `useLoader`)

Compared with Redux / MobX / Zustand, easy-model aims to **keep an OOP‑like mental model while providing solid performance, strong typing, and built‑in IoC capabilities**.

### Feature overview

- **Class‑based Model**
  Use TypeScript classes to model your domain: fields are state, methods are business logic. No extra action / reducer ceremony.

- **Instance by arguments**
  With `provide`, calls with the same arguments return the same instance, while different arguments get different instances. This makes it natural to partition state by business keys.

- **Deep change watching**
  `watch` / `useWatcher` can listen to:
  - Changes of model fields
  - Nested object property changes
  - Changes in nested / referenced instances
  - Changes of derived instances returned from getters

- **React Hooks friendly**
  - `useModel`: create and subscribe to a model in a component
  - `useInstance`: subscribe to an existing instance
  - `useWatcher`: attach watchers in function components
  - `useLoader`: read global loading state and per‑method loading state

- **IoC container & dependency injection**
  - Use `Container` / `CInjection` / `VInjection` / `config` to configure injection
  - Use `inject` decorator to declare dependencies in classes via schema
  - Support namespace isolation and `clearNamespace` cleanup

### Examples (`example/`)

The `example/` directory contains runnable examples to quickly understand the APIs. Below are several key usage snippets.

- **Basic counter: `useModel` / `useWatcher`** (see `example/index.tsx`)  
  `CounterModel` shows how to create a model instance in a function component, read / update fields, and watch changes:

```tsx
import { useModel, useWatcher } from "easy-model";

class CounterModel {
  count = 0;
  label: string;
  constructor(initial = 0, label = "Counter") {
    this.count = initial;
    this.label = label;
  }
  increment() {
    this.count += 1;
  }
  decrement() {
    this.count -= 1;
  }
}

function Counter() {
  const counter = useModel(CounterModel, [0, "Demo"]);

  useWatcher(counter, (keys, prev, next) => {
    console.log("changed:", keys.join("."), prev, "->", next);
  });

  return (
    <div>
      <h2>{counter.label}</h2>
      <div>{counter.count}</div>
      <button onClick={() => counter.decrement()}>-</button>
      <button onClick={() => counter.increment()}>+</button>
    </div>
  );
}
```

- **Cross‑component communication: `useModel` + `useInstance`**  
  With `CommunicateModel` + `provide`, multiple components share the same instance (grouped by key):

```tsx
import { provide, useModel, useInstance } from "easy-model";

class CommunicateModel {
  constructor(public name: string) {}
  value = 0;
  random() {
    this.value = Math.random();
  }
}

const CommunicateProvider = provide(CommunicateModel);

function CommunicateA() {
  const { value, random } = useModel(CommunicateModel, ["channel"]);
  return (
    <div>
      <span>Component A: {value}</span>
      <button onClick={random}>Change value</button>
    </div>
  );
}

function CommunicateB() {
  const { value } = useInstance(CommunicateProvider("channel"));
  return <div>Component B: {value}</div>;
}
```

- **Standalone watcher: `watch`**  
  Watch an instance outside React or in plain functions, and record changes into a log list:

```tsx
import { provide, watch } from "easy-model";

class WatchModel {
  constructor(public name: string) {}
  value = 0;
}

const WatchProvider = provide(WatchModel);
const inst = WatchProvider("watch-demo");

const stop = watch(inst, (keys, prev, next) => {
  console.log(`${keys.join(".")}: ${prev} -> ${next}`);
});

inst.value += 1;
// Stop watching when it is no longer needed
stop();
```

- **Async loading & global loading: `loader` / `useLoader`**  
  Decorate async methods and read global / per‑method loading states in components:

```tsx
import { loader, useLoader, useModel } from "easy-model";

class LoaderModel {
  constructor(public name: string) {}

  @loader.load(true)
  async fetch() {
    return new Promise<number>(resolve =>
      setTimeout(() => resolve(42), 1000)
    );
  }
}

function LoaderDemo() {
  const { isGlobalLoading, isLoading } = useLoader();
  const inst = useModel(LoaderModel, ["loader-demo"]);

  return (
    <div>
      <div>Global loading: {String(isGlobalLoading)}</div>
      <div>Current loading: {String(isLoading(inst.fetch))}</div>
      <button onClick={() => inst.fetch()} disabled={isGlobalLoading}>
        Trigger async loading
      </button>
    </div>
  );
}
```

- **Dependency injection example: `example/inject.tsx`**  
  Demonstrates how to describe dependencies with a zod schema and inject them via the container:

```tsx
import {
  CInjection,
  Container,
  VInjection,
  config,
  inject,
} from "easy-model";
import { object, number } from "zod";

const schema = object({ number: number() }).describe("schema for demo");

class Test {
  xxx = 1;
}

class MFoo {
  @inject(schema)
  bar?: { number: number };
  baz?: number;
}

config(
  <Container>
    <CInjection schema={schema} ctor={Test} />
    <VInjection schema={schema} val={{ number: 100 }} />
  </Container>
);
```

- **Benchmark example: `example/benchmark.tsx`**  
  A **rough performance comparison panel** for easy-model / Redux / MobX / Zustand under the same scenario, explained below.

### Tests (`test/`)

The `test/` directory uses Vitest + React Testing Library to cover core behaviors:

- **`provide` and instance caching**
  - Same arguments return the same instance
  - Different arguments return different instances

- **Deep watch capabilities**
  - Listen for simple field changes
  - Listen for nested object property changes
  - Handle nested reference relationships between instances
  - Support getters returning instances (such as `child2`) with correct change paths

- **IoC configuration and namespaces**
  - Register dependencies via `config` + `Container` + `CInjection` / `VInjection`
  - Use `isRegistered` to check whether a schema is registered in a namespace
  - Use `clearNamespace` to clear registrations in a namespace

- **Hooks behavior**
  - `useModel` + `useInstance` share state between components and keep UI in sync
  - `useWatcher` listens to model changes in function components
  - `loader` + `useLoader` correctly reflect global / per‑method loading states

### Comparison with Redux / MobX / Zustand

The following table compares easy-model with popular libraries from the perspective of **mental model / complexity / performance & capability boundaries**:

| Library        | Programming model             | Typical cognitive load                                                 | Built‑in IoC / DI      | Performance (in this repo's scenario)        |
| -------------- | ----------------------------- | ---------------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| **easy-model** | Class model + Hooks + IoC     | Write classes and methods, use a few APIs (`provide` / `useModel` / `watch` etc.) | Yes                    | Still **single‑digit milliseconds** in extreme bulk updates |
| **Redux**      | Immutable state + reducers    | Requires actions / reducers / dispatch and lots of boilerplate         | No                     | **Tens of milliseconds** in the same scenario |
| **MobX**       | Observable objects + decorators | Some learning cost about the reactive system and hidden dependency tracking | No (reactive but not IoC) | Faster than Redux, **teens of milliseconds** |
| **Zustand**    | Hook store + functional updates | Simple API, lightweight, good for local state                          | No                     | **Fastest** in this particular scenario      |

From the project’s perspective, easy-model features:

- **Compared with Redux**
  - No need to split actions / reducers / selectors; business logic lives directly in model methods
  - Avoids heavy boilerplate; type inference is more straightforward (based on class fields and method signatures)
  - Automatically handles instance caching and subscriptions, without manual connect / useSelector

- **Compared with MobX**
  - Keeps the intuitive benefits of class models, while using explicit APIs (`watch` / `useWatcher`) to expose dependencies
  - Dependency injection, namespaces, and cleanup are first‑class in easy-model, not extra utilities

- **Compared with Zustand**
  - Performance is comparable (in this benchmark, easy-model is still in the single‑digit millisecond range) while providing a more complete mix of IoC / DI / deep watch
  - Better suited for medium‑to‑large projects where you need clear domain models and dependency relationships, not just lightweight local stores

### Benchmark scenario (rough comparison with Redux / MobX / Zustand)

In `example/benchmark.tsx`, the project includes a **simple yet extreme** benchmark to roughly compare different state managers under a "mass synchronous writes" scenario. The core scenario:

1. **Initialize an array with 10,000 numbers**
2. On button click, perform **5 rounds of increment** on all elements
3. Use `performance.now()` to measure the time of **synchronous computation and state writes**
4. **Do not include React initial render time**, only focus on the time per click

On a typical dev machine, one sample run (ms, single representative run) may look like:

| Implementation  | Time (ms) |
| --------------- | --------- |
| **easy-model**  | ≈ 3.1     |
| **Redux**       | ≈ 51.5    |
| **MobX**        | ≈ 16.9    |
| **Zustand**     | ≈ 0.6     |

Important notes:

- This is an **intentionally extreme bulk update** scenario, meant to amplify differences in "large synchronous writes + notification" paths.
- Results depend on browser / Node version, hardware, bundling mode, etc., so they are **only indicative trends**, not a rigorous benchmark.
- Zustand is expected to be the fastest here, which matches its positioning as a minimal store.
- easy-model is slightly slower than Zustand in this extreme case but **significantly faster than Redux / MobX**, while:
  - Providing class models + IoC + deep watch
  - Offering a structured coding experience for mid‑ to large‑scale business apps

### Links & keywords

- **GitHub repo**: [`ZYF93/easy-model`](https://github.com/ZYF93/easy-model)
- **npm package**: [`@e7w/easy-model`](https://www.npmjs.com/package/@e7w/easy-model)
- **Keywords**: `react` / `state management` / `state manager` / `ioc` / `dependency injection` / `class model` / `react hooks` / `watcher` / `loader` / `typescript`

### When to use it

easy-model works best when:

- You have clear domain models and want classes to hold both data and behavior
- You need convenient dependency injection for repositories, services, configs, schemas, etc.
- You often need to **watch models / nested fields** for changes
- You want performance close to light‑weight state libraries without sacrificing structure and maintainability

If you are using Redux / MobX / Zustand today and you want to:

- Reduce mental overhead and boilerplate
- Get a more natural class model + IoC experience
- Avoid a noticeable performance hit

…then you can start by migrating a subset of modules to easy-model and run the benchmark in `example/benchmark.tsx` on your own machine and data scale.

### Further documentation (`docs/`)

This repo also provides more **practical, engineering‑oriented** Chinese documentation, recommended for real‑world projects:

- [GUIDE (CN)](./docs/GUIDE.md): Best‑practice guide covering design concepts, model design, React integration, loader / watcher usage, etc.
- [ARCHITECTURE (CN)](./docs/ARCHITECTURE.md): How to organize directories and layering around easy-model in a real project.
- [COOKBOOK (CN)](./docs/COOKBOOK.md): Scenario‑based recipes (forms, lists, global user, notification center, etc.).
- [FAQ (CN)](./docs/FAQ.md): Frequently asked questions and troubleshooting ideas.

English versions of these docs are also available:

- [GUIDE (EN)](./docs/GUIDE.en.md)
- [ARCHITECTURE (EN)](./docs/ARCHITECTURE.en.md)
- [COOKBOOK (EN)](./docs/COOKBOOK.en.md)
- [FAQ (EN)](./docs/FAQ.en.md)

