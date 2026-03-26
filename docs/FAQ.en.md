## easy-model FAQ

This FAQ collects common questions when using easy-model, with suggested solutions to help you debug faster.

---

## 1. A field changed but the component did not re-render. Why?

**Possible causes:**

- The instance was not obtained via `useModel` / `useInstance`; you manually did `new Model()`.
- You destructured the model in a way that "breaks reactivity", for example:
  - `const { count } = useModel(CounterModel, []);` and later you only use `count`.
  - In that pattern, updates to `count` on the model will not trigger re-renders that depend only on the destructured value.
- You mutated a plain object that is not part of the proxied model fields (e.g. you attached an external object to the model and mutated it in place).

**Recommended usage:**

- Always get instances via `useModel` or `useInstance`:
- Just use `useModel(ModelClass, [args])` to share instances across components (internally calls useInstance)

```tsx
// Method 1: Just use useModel (recommended)
const model = useModel(CounterModel, []);
// Same args automatically share the same instance
return <div>{model.count}</div>;

// Method 2: use useInstance
const model = useInstance(existingModel);
return <div>{model.count}</div>;
```

---

## 2. When should I use easy-model, and when is it overkill?

**Good fits for easy-model:**

- The same business state must be shared across multiple components or pages.
- Business logic is complex (multi-step flows, validation, async calls, state transitions, etc.).
- You want a testable, reusable "domain model" layer and don’t want logic scattered in components, hooks, and utils.

**Cases where you may not need easy-model:**

- Small, purely local component state, such as "is expanded", "current tab index", etc. In such cases `useState` is enough.
- One-off demos or very simple forms with no clear reuse / evolution needs.

Heuristic: **Once you start writing a lot of `if` / `for` / computation logic in a component, consider extracting that logic into a model.**

---

## 3. What’s the difference between `watch` and `useWatcher`?

- **`useWatcher(model, callback)`**
  - For React components only.
  - Lifecycle is tied to the component: it starts on mount and stops on unmount.
  - Great for side effects that are closely tied to the rendered UI (e.g. keeping a change history).

- **`watch(instance, callback)`**
  - Can be used outside components.
  - Returns a `stop` function; you must call it manually to stop watching.
  - Better suited for global logging, analytics, debugging, etc. that are not bound to a specific component.

In short, **`useWatcher` is the "component‑bound watch", while `watch` is lower‑level and global.**

---

## 4. What exactly does `@loader.load` do? How does it work with `useLoader`?

- When you decorate an async method with `@loader.load`, easy-model will:
  - Track a "loading token" for the duration of the method.
  - Make that method’s loading state available via `isLoading(target)` from `useLoader()`.
  - Optionally (for global loaders), increment / decrement a global loading counter.

- In a component:

```ts
const { isGlobalLoading, isLoading } = useLoader();
const model = useModel(SomeModel);

const localLoading = isLoading(model.someAsyncMethod);
```

This lets you:

- Drive global loading (page overlays, top progress bars) via `isGlobalLoading`.
- Drive per‑button loading via `isLoading(model.someAsyncMethod)`.

> Common mistake: manually maintaining local `useState` loading flags in components instead of reusing loader, which leads to multiple overlapping loading states that are hard to manage consistently.

---

## 5. Do I still need `useCallback` / `useMemo`?

easy-model focuses on **organizing state and domain logic**; it does not prevent you from using React’s performance tools.

- If a child component receives model fields or methods as props, re-rendering cost is often acceptable.
- When you hit performance limits, consider:
  - Wrapping pure presentational components with `memo`.
  - Using `useCallback` for callbacks passed to frequently re-rendered children.

**Heuristic:**

- Rely first on good component decomposition and model design to avoid unnecessary re-renders.
- Don’t sprinkle `useCallback` everywhere preemptively.

---

## 6. Can models directly touch the DOM or browser APIs?

Not recommended.

- Models are best as a "pure business layer" that only deals with data and flows.
- Direct DOM or browser API usage (`window.location`, etc.) is better placed in:
  - Components (closer to the usage site), or
  - Dedicated services that models call indirectly.

**Recommended patterns:**

- Need navigation? Inject a "navigation service" into models and encapsulate the details (React Router, etc.) there.
- Need local storage? Wrap storage access in a `services` utility instead of scattering `localStorage.setItem` across models.

---

## 7. Can a single page use multiple models? Will that be messy?

Absolutely. That’s common for complex pages.

Example: an "Order Detail" page might use:

- Order info model
- Payment model
- Review / rating model

**Suggested organization:**

- At the top of the page component, get multiple model instances:

```tsx
const order = useModel(OrderModel, []);
const payment = useModel(PaymentModel, []);
const comment = useModel(CommentModel, []);
```

- Pass them down to child components so that each child focuses on a single domain.

The key is: **each model has clear responsibilities, and the page just composes them.**

---

## 8. How do I write unit tests? Do I need a React environment?

No React environment is required for most tests.

- Models are plain TypeScript classes; you can operate on their state and methods directly.
- Typically you can bootstrap models via providers in a non‑React test:

```ts
test("counter works", () => {
  const counter = provide(CounterModel)();
  counter.increment();
  expect(counter.count).toBe(1);
});
```

When models depend on external services:

- Abstract external dependencies as interfaces and inject mock implementations in tests, or
- Register a test‑only implementation in the DI container.

> Only when testing `useModel` / `useInstance` with actual components do you need a React test environment.

---

## 9. Where should I start when migrating a legacy project?

Start from **small, well‑bounded modules**:

- Login, user info, or smaller standalone pages are good candidates.

Suggested steps:

1. Pick a module and extract its state and logic into a model.
2. Replace the old Redux / MobX / Zustand / Context usage on that page with `useModel`.
3. Once behavior matches, remove the old state management code for that module.
4. Repeat for other modules.

Key point: **change one business area at a time, keep changes small and reversible.**

---

## 10. How should I debug when something goes wrong?

A simple checklist:

1. **Does the component get the model via `useModel` / `useInstance`?**
2. **Is the model method actually being called?** (Insert a temporary `console.log` or use a watcher.)
3. **Are async methods properly awaited or wired to loader?**
4. **Are there duplicated states?** (e.g. local `useState` plus a model field with the same meaning.)

If you confirm the issue is with easy-model behavior:

- Use `watch` or `useWatcher` to log key field changes.
- Create a minimal reproducible demo to compare expected vs. actual behavior.
