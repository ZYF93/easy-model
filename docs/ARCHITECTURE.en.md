## Architectural practices with easy-model

This document explains how to organize code and layering around easy-model in a typical React / TypeScript project so that teams can keep the codebase maintainable in the long run.

---

## 1. What kinds of projects benefit most

- **Admin consoles / dashboards**
  - Multiple menu pages, lists + details, filters, charts, and forms.
- **Business‑process oriented apps**
  - Clear domains (users, orders, products, reports, etc.) that share state and logic across pages.
- **Component‑heavy, collaborative projects**
  - You want unified conventions to reduce cognitive load and help newcomers ramp up quickly.

The common trait: **business state is more complex than the UI**, which makes it worthwhile to extract "domain state + domain logic" into easy-model.

---

## 2. Recommended directory structure

For a typical frontend app (adjust as needed):

```txt
src/
  models/           # Business models (easy-model core)
    user.ts
    order.ts
    dashboard.ts

  pages/            # Page-level components (typically route targets)
    user/
      index.tsx
    order/
      index.tsx

  components/       # Presentational / reusable components
    common/
      Button.tsx
      Table.tsx

  services/         # Backend interaction (APIs, SDK wrappers, etc.)
    http.ts
    user-api.ts
    order-api.ts

  hooks/            # Generic, business-agnostic hooks
    useDebounce.ts
    useMediaQuery.ts

  utils/            # Utilities, constants, helpers
    format.ts
    constants.ts
```

- **`models/`**
  - Hosts all easy-model based domain models.
  - Each file corresponds to one relatively independent domain (user, order, dashboard, etc.).
- **`pages/`**
  - Compose models, routing, and views.
  - Avoid embedding complex business logic; call model methods instead.
- **`components/`**
  - General, presentation‑oriented, reusable.
  - Should not depend directly on specific models; receive data and callbacks via props.
- **`services/`**
  - HTTP wrappers, API definitions, and external integrations.
  - Models typically depend on services rather than calling `fetch/axios` directly.

---

## 3. Layering and dependency direction

Recommended dependency direction from inner to outer layers:

```txt
services → models → pages → components
```

- **Services layer**
  - Talks to the outside world: backend APIs, local storage, SDKs, etc.
  - Does not depend on models; exposes pure functions or classes.

- **Models (domain layer)**
  - Encapsulate business state and logic via easy-model.
  - May depend on `services`, but not vice versa.
  - Should not depend on specific pages / components; focus on domain concerns only.

- **Pages (page layer)**
  - Use routing/layout to assemble one or more models into a page.
  - Get model instances via `useModel` / `useInstance`, coordinate them with `useLoader` / `useWatcher`, etc.

- **Components (view layer)**
  - Presentational or light wrappers.
  - Ideally unaware of easy-model; get data and events via props.

> Rule of thumb: **the deeper the layer, the less it should know about outer layers**. A model should not know which page uses it; it only cares about its domain responsibilities.

---

## 4. Full flow from route to view

Take an "Order list" page as an example. A recommended flow:

1. **Routing and page component**
   - Route configuration points to `pages/order/index.tsx`.
   - Page component uses `useModel(OrderListModel, [...args])` to get a model.
2. **Page logic**
   - Calls model methods (`loadList()`, `changeFilter()`, etc.) in `useEffect` or event handlers.
   - Uses `useLoader` for loading state to control global / local spinners.
   - Passes model fields / derived data down to presentation components.
3. **Model and service layer**
   - `OrderListModel` depends on `order-api` to call backend endpoints.
   - Async methods are decorated with `@loader.load` to track loading.
4. **Presentation components**
   - Care only about list data, pagination, callbacks, etc. No knowledge of easy-model details.

High‑level schematic:

```txt
Route → Page (OrderPage)
      → useModel(OrderListModel)
          ↘ services/order-api

Page → Presentational components (Table, FilterBar, etc.)
```

Benefits:

- Debugging a business area usually requires only looking at a single model file.
- Pages remain orchestration layers rather than turning into monoliths.

---

## 5. Suggested structure of a model file

A typical model file can contain:

1. **Domain type definitions**
   - e.g. order item, filter, pagination.
2. **State fields**
   - Raw data fields for current state.
3. **Derived properties (getters)**
   - Computations based on state, returning statistics or view‑ready data.
4. **Business methods**
   - Semantic operations like `loadList`, `applyFilter`, `reset`.
5. **Async methods with loader**
   - Methods that hit the network or are expensive are decorated with `@loader.load`.

> Recommendation: **Keep the public interface of each model small and clear**. Avoid exposing too many "half‑baked" structures so page code reads like "calling business APIs" instead of "manually assembling state".

---

## 6. Integration with the React ecosystem

- **With React Router**
  - Page components are mounted via routes and use easy-model internally.
  - For route parameters (e.g. `id`), pass them as constructor arguments via `useModel`.

- **With global layouts / top‑level components**
  - Some globally unique models that may have side effects outside components (user info, global config) can be created via `provide`.
  - Pages then reuse them via `useInstance`.

- **With UI libraries**
  - easy-model is UI‑agnostic (Ant Design, MUI, Tailwind, etc.).
  - Keep models independent of UI so you can swap UI libraries freely.

---

## 7. Team collaboration and evolution

- **Shared conventions**
  - Document in the team README / architecture docs that business state should live in easy-model first.
  - Standardize naming and folder structure under `models/` to avoid scattering a single domain across multiple locations.

- **Code review focus points**
  - For new complex logic, check whether it should sit in a model.
  - Ensure pages rely on model methods/fields instead of piling up conditionals and loops in components.
  - Confirm async methods are correctly wired with loader to keep loading UX consistent.

- **Evolution strategy**
  - When migrating legacy projects, start by introducing easy-model in a single domain (e.g. user / login).
  - Build new feature modules following this architecture and dependency direction, avoiding a "mixed" architecture that becomes harder to maintain.
