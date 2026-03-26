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

---

## 11. Form utilities (form-utils)

easy-model provides a decorator-based form field metadata toolkit that helps you declare form field configuration (validation, permission, dependencies, etc.) directly on your model class and extract it via `formUtils.getProps` for rendering.

### 11.1 Core decorators

- **`@formUtils.prop(name)`**: Sets the display name for the field.
- **`@formUtils.required()`**: Marks the field as required.
- **`@formUtils.validate(fn)`**: Provides a validation function returning `{ valid: boolean; message?: string }`.
- **`@formUtils.readonly()`**: Marks the field as read-only.
- **`@formUtils.permission(code)`**: Sets a permission code.
- **`@formUtils.dependsOn(fn)`**: Sets a conditional function that controls whether the field is active.
- **`@formUtils.config(fieldConfig)`**: Sets UI-related configuration (type, width, options, etc.).
- **`@formUtils.placeholder(text)`**: Sets placeholder text.

### 11.2 Usage example

```ts
import { formUtils } from "easy-model";

class UserFormModel {
  @(formUtils
    .prop("Username")
    .required()
    .validate(value => {
      if (typeof value !== "string" || value.length < 3) {
        return {
          valid: false,
          message: "Username must be at least 3 characters",
        };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" })
    .placeholder("Enter username"))
  username = "";

  @(formUtils
    .prop("Email")
    .required()
    .validate(value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== "string" || !emailRegex.test(value)) {
        return { valid: false, message: "Please enter a valid email address" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" })
    .placeholder("Enter email"))
  email = "";

  @(formUtils
    .prop("Age")
    .validate(value => {
      if (typeof value !== "number" || value < 0 || value > 120) {
        return { valid: false, message: "Age must be between 0 and 120" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "50%" })
    .placeholder("Enter age"))
  age = 0;

  @(formUtils.prop("Admin").config({ type: "checkbox", width: "auto" }))
  isAdmin = false;

  @(formUtils
    .prop("Admin Code")
    .dependsOn(function (this: UserFormModel) {
      return this.isAdmin; // Only show when isAdmin is true
    })
    .required()
    .config({ type: "input", width: "100%" })
    .placeholder("Admin code"))
  adminCode = "";

  @(formUtils
    .prop("Role")
    .permission(1)
    .config({
      type: "select",
      width: "100%",
      getOptions: () => ["user", "moderator", "admin"],
    }))
  role = "user";

  @(formUtils
    .prop("Description")
    .readonly()
    .config({ type: "textarea", width: "100%" })
    .placeholder("Description"))
  description = "This is a read-only field";
}

// Get form configuration
const formProps = formUtils.getProps(UserFormModel);
```

### 11.3 Using in components

```tsx
function FormRenderer() {
  return (
    <form>
      {formProps.map(field => (
        <FormField key={field.name} config={field} />
      ))}
    </form>
  );
}
```

### 11.4 Best practices

- **Chaining**: All decorators support chaining for flexible configuration.
- **Type safety**: Leverage TypeScript's type inference to avoid runtime errors.
- **Dependencies**: Use `dependsOn` to handle inter-field dependencies.
- **Permission control**: Implement field-level permissions with `permission`.

---

## 12. History tracking (history)

easy-model includes a lightweight history tracker that records model changes and allows undo/redo/reset operations.

### 12.1 Core API

- **`collect(model)`**: Creates a history manager for a model instance.
- **`useModelHistory(model)`**: React hook returning the history manager.

### 12.2 History manager methods

- **`hasPrev`**: whether there is a previous history entry
- **`hasNext`**: whether there is a next history entry
- **`back()`**: undo to the previous state
- **`forward()`**: redo to the next state
- **`reset()`**: restore the model to its initial state

### 12.3 Usage example

```tsx
import { useModel, useModelHistory } from "easy-model";

class CounterModel {
  count = 0;
  increment() {
    this.count += 1;
  }
  decrement() {
    this.count -= 1;
  }
}

function HistoryDemo() {
  const counter = useModel(CounterModel, []);
  const history = useModelHistory(counter);

  return (
    <div>
      <div>{counter.count}</div>
      <button onClick={() => counter.decrement()}>-</button>
      <button onClick={() => counter.increment()}>+</button>

      <button onClick={() => history.back()} disabled={!history.hasPrev}>
        Undo
      </button>
      <button onClick={() => history.forward()} disabled={!history.hasNext}>
        Redo
      </button>
      <button onClick={() => history.reset()}>Reset to initial state</button>
    </div>
  );
}
```

### 12.4 How it works

- Automatically records change paths and values on each model field change
- `back()` restores the model to the previous state
- `forward()` advances to the next recorded state
- `reset()` restores all changes back to the initial state
- Supports nested object change tracking

### 12.5 Best practices

- **User experience**: Provide undo/redo buttons in interfaces that need undo functionality.
- **Performance**: History records consume memory; periodically clean history in long-running apps.
- **Boundary handling**: Check `hasPrev`/`hasNext` states before undo/redo operations.
- **Combined usage**: Can be combined with form utilities to provide undo functionality for forms.
