## easy-model Guide

---

## 1. Design philosophy & when to use it

- **Core ideas**
  - **Models host business logic, components focus on views**: move business state, computations, and side effects into models; keep React components focused on UI and event wiring.
  - **"Class + Hook" centric**: describe domain objects with plain TypeScript classes, then wire them into React via `useModel` / `useInstance`.
  - **Composable capabilities**: a single model can act as a **state container, DI target, async loader, and watch source** at the same time.

- **When easy-model is recommended**
  - You have lots of **business state** (orders, users, forms, permissions, etc.) that must be shared across components.
  - Domain logic is heavy and does not fit inside components or ad‑hoc hooks.
  - You care about **testability and maintainability**, and want to avoid Redux‑style boilerplate.

---

## 2. Project structure & naming

- **Suggested directory layout**
  - In a frontend project, create a dedicated `models` folder for business models, for example:
    - `src/models/user.ts`
    - `src/models/order.ts`
    - `src/models/dashboard.ts`
  - Each file focuses on one domain and exports:
    - **Model class**: the main carrier of business logic.
    - **Optional factory / Provider**: e.g. `provide`‑based factory helpers.
    - **Domain types**: exported via `export type`.

- **Naming conventions**
  - **Class names use domain terms**: `User` / `Order` / `Cart`, etc.
  - **Instances / providers use nouns**: `user`, `order`, `createUserProvider`, etc.
  - Avoid `new`‑ing models directly in components; use easy-model Hooks / Providers instead.

---

## 3. Best practices for defining models

### 3.1 State and derived data

- **Put business state on the model**

```ts
class CounterModel {
  count = 0;
  label: string;

  constructor(initial = 0, label = "Counter") {
    this.count = initial;
    this.label = label;
  }
}
```

- **Expose derived data via getters / methods**
  Avoid recomputing aggregates in components:

```ts
class OrderModel {
  items: { price: number; count: number }[] = [];

  get totalPrice() {
    return this.items.reduce((sum, i) => sum + i.price * i.count, 0);
  }
}
```

### 3.2 Semantic business methods

- **Avoid exposing low‑level "mutate field" operations**; expose semantic business actions:
  - e.g. `increaseCount()`, `submitOrder()`, `login()`, instead of `setState(field, value)`.
  - Put validation and boundary checks into these methods so components only call them.

```ts
class CounterModel {
  count = 0;

  increment() {
    this.count += 1;
  }

  decrement() {
    this.count -= 1;
  }
}
```

### 3.3 Types & maintainability

- **Keep types in the model layer**
  - Domain types (user, order, etc.) live next to the model and are exported via `export type`.
  - Avoid repeating identical literal types in components or utility functions.

- **Avoid `any`**
  - Fields, parameters, and return values on models should be strongly typed for better IDE support and safer refactors.

---

## 4. Using easy-model in React

### 4.1 `useModel`: create / inject / share model instances

- **When to use**
  - A component needs a **lifecycle‑bound** model instance, or multiple instances distinguished by arguments (e.g. per tab).
  - You want to share a model instance across components.

- **Key points**
  - `useModel` takes the model class as first argument, and an optional second argument for constructor parameters or keying.
  - Changes to model fields automatically re‑render components that read them.

```ts
function CounterView() {
  const { label, count, decrement, increment } = useModel(CounterModel, [0, "Demo"]);

  return (
    <div>
      <div>{label}</div>
      <div>{count}</div>
      <button onClick={() => decrement()}>-</button>
      <button onClick={() => increment()}>+</button>
    </div>
  );
}

function CounterView2() {
  const { count } = useModel(CounterModel, [0, "Demo"]);

  return <div>{count}</div>;
}
```

- **Best practice**
  - In components, **only read public fields / call public methods**; don’t re‑implement business logic in JSX.

### 4.2 `provide` + `useInstance`: shared instances

- **When to use**
  - The same model instance must be shared, e.g. global settings, system status, or cross‑section communication.

- **Usage pattern**

```ts
// Define provider and create instance
const globalConfig = provide(GlobalConfigModel)("global");

// Component A: use instance
function ConfigPanel() {
  const model = useInstance(globalConfig);
  // ...
}

// Component B: reuse the same instance
function AnotherComponent() {
  const model = useInstance(globalConfig);
  // ...
}

// Reuse the same instance outside components
if (!globalConfig.ready) globalConfig.loadConf();
```

- **Best practice**
  - Use semantic keys (e.g. `"global"`, `"current-user"`) to distinguish instances.
  - Centralize `provide` calls in a dedicated file for easier refactors.

### 4.3 `useWatcher` / `watch`: reacting to changes

- **Differences and scenarios**
  - `useWatcher(model, callback)`: inside React components, for UI‑related side effects.
  - `watch(model, callback)`: outside components (or in generic hooks), for logging, analytics, debugging, etc.

- **Example: watcher inside component**

```ts
function CounterWithLog() {
  const counter = useModel(CounterModel);
  const [log, setLog] = useState<string[]>([]);

  useWatcher(counter, (keys, prev, next) => {
    setLog(list => [
      ...list,
      `${keys.join(".")}: ${String(prev)} -> ${String(next)}`,
    ]);
  });

  // render omitted...
}
```

- **Best practice**
  - Watchers should only perform side effects (logging, reporting, syncing outward). Avoid modifying the same model inside the callback to keep logic easy to follow.

---

## 5. Best practices for async and loader

### 5.1 Using `loader.load` to wrap async methods

- **Purpose**
  - Automatically collect "loading" state for methods, and drive global / local loading UI in a consistent way.

- **Typical usage**

```ts
class ProfileModel {
  constructor(public name: string) {}

  @loader.load(true) // true = participate in global loading
  async fetchProfile() {
    // async request...
  }
}
```

- **Guidelines**
  - Wrap all async methods related to page loading / submission with `@loader.load`.
  - Only mark a method as `true` (global) when it should affect a global spinner / overlay.

### 5.2 `useLoader`: reading loading state in UI

- **Example**

```ts
function LoaderDemo() {
  const { isGlobalLoading, isLoading } = useLoader();
  const profile = useModel(ProfileModel, ["profile"]);

  return (
    <div>
      <div>Global loading: {String(isGlobalLoading)}</div>
      <div>Current loading: {String(isLoading(profile.fetchProfile))}</div>
      <button onClick={() => profile.fetchProfile()} disabled={isGlobalLoading}>
        Reload
      </button>
    </div>
  );
}
```

- **Best practice**
  - Global loading (page overlay) should be driven by `isGlobalLoading`.
  - Local button loading / disabled state should use `isLoading(model.method)`.

---

## 6. DI (dependency injection) recommendations

> If you use easy-model’s injection features (`inject` and related decorators), this section provides guidelines.

- **Always get dependencies via injection**
  - Wrap HTTP clients, configs, routers, etc. into injectable objects and inject them into models.
  - Avoid `new`‑ing dependencies in constructors or methods; this keeps testing and swapping implementations easy.

- **Clear separation of layers**
  - Models care about "calling interfaces", not concrete implementations (mock vs real).
  - Combined with providers, you can register different implementations at app entry (dev / prod / test).

---

## 7. Recommended page development workflow

- **1) Clarify the domain of the page**
  - E.g. "User center", "Order list", "Dashboard". Decide whether there is an existing model.

- **2) Prefer reusing / extending existing models**
  - When new requirements land on an existing domain, extend that model (fields or methods) instead of adding lots of local state in components.

- **3) Components do only three things**
  - Get model instances via `useModel` / `useInstance`.
  - Render UI (including conditional rendering and styling).
  - Delegate events (clicks, inputs) to public model methods.

- **4) Wire up async and loading from day one**
  - Decorate async methods with `@loader.load`.
  - Use `useLoader` at page level to bind global / local loading.

- **5) Add watchers where needed**
  - Plan which models require logs / analytics early; use `useWatcher` or global `watch` on critical pages.

---

## 8. Performance & debugging tips

- **Reduce unnecessary re‑renders**
  - Move frequently changing but unrelated state into other models or smaller models.
  - Only read fields that the component truly needs.

- **Debugging**
  - Use `watch` / `useWatcher` to log change paths (e.g. `keys.join(".")`) when tracking "who changed this value".
  - Add simple `reset()` or debug helpers on important models to quickly reset state in development.

---

## 9. Migration & incremental adoption

- **Migrating from traditional state managers**
  - Start from a **single module**, e.g. login or user info.
  - Define a model and wire React via easy-model; then gradually remove the equivalent Redux / MobX / Zustand logic.

- **Notes for incremental introduction**
  - In project docs, state clearly: new business should prefer easy-model, old and new solutions may coexist temporarily.
  - Provide common model examples (auth, global config, notifications, etc.) to lower onboarding cost.

---

## 10. Summary

- **Abstract business into models; keep components as pure views** — this is the key to easy-model’s maintainability.
- **Use Hooks / Providers consistently** to work with models; avoid ad‑hoc `new` and manual lifecycle management.
- Combine `loader`, `watch`, and DI to cover most state management needs in typical admin / dashboard projects without extra libraries.
