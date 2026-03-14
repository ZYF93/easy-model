## easy-model Scenario Cookbook

This document provides "recipe‑style" patterns for common business scenarios implemented with easy-model. Examples are pseudo‑code level; the focus is on patterns rather than exact fields.

---

## 1. Simple counter (getting started)

### 1.1 Model design

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

### 1.2 Component usage

```tsx
function Counter() {
  const counter = useModel(CounterModel);

  return (
    <div>
      <div>{counter.count}</div>
      <button onClick={() => counter.decrement()}>-</button>
      <button onClick={() => counter.increment()}>+</button>
    </div>
  );
}
```

**Key points:**

- Put logic in the model from day one instead of `useState`; adding caps, stats, or tracking later becomes easier.

---

## 2. Form scenario (local validation + submit)

### 2.1 Model design

Goal: a simple login form with username, password, local validation, and submit.

```ts
class LoginFormModel {
  username = "";
  password = "";
  error = "";

  get isValid() {
    return this.username.length > 0 && this.password.length >= 6;
  }

  changeUsername(value: string) {
    this.username = value;
  }

  changePassword(value: string) {
    this.password = value;
  }

  setError(message: string) {
    this.error = message;
  }

  async submit() {
    if (!this.isValid) {
      this.setError("Please check username and password");
      return;
    }
    // Call service layer (pseudo-code)
    // await authService.login({ username: this.username, password: this.password });
  }
}
```

### 2.2 Component usage

```tsx
function LoginForm() {
  const form = useModel(LoginFormModel, []);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        form.submit();
      }}
    >
      <input
        value={form.username}
        onChange={e => form.changeUsername(e.target.value)}
      />
      <input
        type="password"
        value={form.password}
        onChange={e => form.changePassword(e.target.value)}
      />

      {!form.isValid && <div>Please complete the form</div>}
      {form.error && <div>{form.error}</div>}

      <button type="submit">Login</button>
    </form>
  );
}
```

**Key points:**

- Form validation lives in the model; the component only displays errors and calls `submit`.
- Add analytics, redirects, etc. in `submit` without polluting the component.

---

## 3. List + filter + pagination

### 3.1 Model design

Typical "table page": list data, filters, pagination.

```ts
interface ListItem {
  id: number;
  name: string;
}

class ListModel {
  items: ListItem[] = [];
  page = 1;
  pageSize = 10;
  total = 0;

  keyword = "";

  get hasData() {
    return this.items.length > 0;
  }

  changeKeyword(value: string) {
    this.keyword = value;
    this.page = 1;
  }

  changePage(page: number) {
    this.page = page;
  }

  async load() {
    // Pseudo-code: call service layer
    // const res = await listService.query({
    //   page: this.page,
    //   pageSize: this.pageSize,
    //   keyword: this.keyword,
    // });
    // this.items = res.items;
    // this.total = res.total;
  }
}
```

### 3.2 Component usage

```tsx
function ListPage() {
  const list = useModel(ListModel);

  useEffect(() => {
    list.load();
  }, [list.page, list.keyword]);

  return (
    <div>
      <input
        placeholder="Search keyword"
        value={list.keyword}
        onChange={e => list.changeKeyword(e.target.value)}
      />

      {!list.hasData && <div>No data</div>}

      {/* Table rendering omitted */}

      {/* Pagination component omitted; onChange calls list.changePage */}
    </div>
  );
}
```

**Key points:**

- Filters and pagination all live in the model; components focus on "current state + actions".
- If multiple pages share similar logic, reuse `ListModel` via inheritance or composition.

---

## 4. Global user info & auth state

### 4.1 Model design

```ts
class UserModel {
  token: string | null = null;
  profile: { name: string } | null = null;

  get isLoggedIn() {
    return Boolean(this.token);
  }

  async login(username: string, password: string) {
    // Call login API (pseudo-code)
    // const { token } = await authService.login({ username, password });
    // this.token = token;
    // this.profile = await authService.fetchProfile();
  }

  async logout() {
    this.token = null;
    this.profile = null;
  }
}
```

### 4.2 Global provider

```ts
const UserProvider = provide(UserModel);
```

### 4.3 Usage in app entry & pages

```tsx
function App() {
  const user = useInstance(UserProvider("global"));

  if (!user.isLoggedIn) {
    return <LoginView />;
  }

  return <MainLayout />;
}
```

**Key points:**

- Use `provide` + `useInstance` to create a global user instance; all pages share the same auth state.
- Keep all auth‑related logic (token management, fetching profile) in `UserModel`.

---

## 5. Global loading vs. button-level loading

### 5.1 Using loader in the model

```ts
class ProfileModel {
  profile: { name: string } | null = null;

  @loader.load(true)
  async fetchProfile() {
    // Pseudo-code:
    // this.profile = await userService.fetchProfile();
  }
}
```

### 5.2 Using loading state in components

```tsx
function ProfilePage() {
  const { isGlobalLoading, isLoading } = useLoader();
  const model = useModel(ProfileModel);

  useEffect(() => {
    model.fetchProfile();
  }, [model]);

  const loadingCurrent = isLoading(model.fetchProfile);

  return (
    <div>
      {isGlobalLoading && <div>Global loading...</div>}

      <button onClick={() => model.fetchProfile()} disabled={loadingCurrent}>
        {loadingCurrent ? "Loading..." : "Refresh"}
      </button>

      {model.profile && <div>{model.profile.name}</div>}
    </div>
  );
}
```

**Key points:**

- `@loader.load(true)` means the async method participates in global loading.
- `isGlobalLoading` drives global UI (overlay, top bar), while `isLoading(fn)` drives local loading.

---

## 6. Notification / message center

### 6.1 Model design

```ts
interface Message {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

class NotifyModel {
  list: Message[] = [];

  push(msg: Omit<Message, "id">) {
    const withId: Message = {
      id: String(Date.now()) + Math.random(),
      ...msg,
    };
    this.list.push(withId);
  }

  remove(id: string) {
    this.list = this.list.filter(m => m.id !== id);
  }
}
```

### 6.2 Global provider & display component

```ts
const NotifyProvider = provide(NotifyModel);
```

```tsx
function NotifyList() {
  const notify = useInstance(NotifyProvider("global"));

  return (
    <div>
      {notify.list.map(m => (
        <div key={m.id}>
          <span>[{m.type}] </span>
          <span>{m.text}</span>
          <button onClick={() => notify.remove(m.id)}>Close</button>
        </div>
      ))}
    </div>
  );
}
```

Anywhere you need to send a notification:

```ts
const notify = useInstance(NotifyProvider("global"));
notify.push({ type: "success", text: "Operation succeeded" });
```

**Key points:**

- Emission and display of notifications are decoupled and highly reusable.
- easy-model ensures all notifications come from one centralized state.

---

## 7. Watcher scenarios: debugging & analytics

### 7.1 Inside a component (`useWatcher`)

```tsx
function DebugCounter() {
  const counter = useModel(CounterModel);
  const [log, setLog] = useState<string[]>([]);

  useWatcher(counter, (keys, prev, next) => {
    setLog(list => [
      ...list,
      `${keys.join(".")}: ${String(prev)} -> ${String(next)}`,
    ]);
  });

  // render log omitted
}
```

### 7.2 Outside components (`watch`)

```ts
const counter = provide(CounterModel)();

const stop = watch(counter, (keys, prev, next) => {
  // Send analytics or log
});

// Call stop() when no longer needed
stop();
```

**Key points:**

- Watchers are best used for "observation" and "recording". Avoid modifying the same model in the callback to keep logic traceable.

---

## 8. Advanced forms (using form-utils)

### 8.1 Model design

Use decorators to define form field metadata, including validation, permissions, dependencies, etc.

```ts
import { forUtils } from "easy-model";

class AdvancedFormModel {
  @(forUtils
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

  @(forUtils
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

  @(forUtils
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

  @(forUtils.prop("Admin").config({ type: "checkbox", width: "auto" }))
  isAdmin = false;

  @(forUtils
    .prop("Admin Code")
    .dependsOn(function (this: AdvancedFormModel) {
      return this.isAdmin; // Only show when isAdmin is true
    })
    .required()
    .config({ type: "input", width: "100%" })
    .placeholder("Admin code"))
  adminCode = "";

  @(forUtils
    .prop("Role")
    .permission(1)
    .config({
      type: "select",
      width: "100%",
      getOptions: () => ["user", "moderator", "admin"],
    }))
  role = "user";

  @(forUtils
    .prop("Description")
    .readonly()
    .config({ type: "textarea", width: "100%" })
    .placeholder("Description"))
  description = "This is a read-only field";

  // Get form configuration
  static getFormProps() {
    return forUtils.getProps(AdvancedFormModel);
  }
}
```

### 8.2 Component usage

```tsx
function AdvancedForm() {
  const formProps = AdvancedFormModel.getFormProps();

  return (
    <form>
      {formProps.map(field => (
        <FormField key={field.name} config={field} />
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}

function FormField({ config }: { config: any }) {
  const {
    name,
    prop: label,
    required,
    readonly,
    fieldConfig,
    placeholder,
    validate,
  } = config;

  const renderField = () => {
    switch (fieldConfig.type) {
      case "input":
        return (
          <input
            name={name}
            placeholder={placeholder}
            readOnly={readonly}
            style={{ width: fieldConfig.width }}
          />
        );
      case "select":
        return (
          <select name={name} style={{ width: fieldConfig.width }}>
            {fieldConfig.getOptions().map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return <input type="checkbox" name={name} />;
      case "textarea":
        return (
          <textarea
            name={name}
            placeholder={placeholder}
            readOnly={readonly}
            style={{ width: fieldConfig.width }}
          />
        );
      default:
        return <div>Unsupported field type</div>;
    }
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        {label} {required && <span style={{ color: "red" }}>*</span>}
      </label>
      {renderField()}
    </div>
  );
}
```

**Key points:**

- Use decorators for declarative form configuration, making code more concise and type-safe.
- `getProps` automatically extracts configuration for dynamic form rendering.
- Combine with `dependsOn` to handle inter-field dependencies.
- Ideal for complex forms, reducing manual validation and configuration code.

---

## 9. Undo functionality (using history)

### 9.1 Model design

Add history tracking to models that need undo functionality.

```ts
class EditableModel {
  title = "Default Title";
  content = "Default Content";

  updateTitle(newTitle: string) {
    this.title = newTitle;
  }

  updateContent(newContent: string) {
    this.content = newContent;
  }

  reset() {
    this.title = "Default Title";
    this.content = "Default Content";
  }
}
```

### 9.2 Component usage

```tsx
function EditableComponent() {
  const model = useModel(EditableModel, []);
  const history = useModelHistory(model);

  return (
    <div>
      <div>
        <label>Title:</label>
        <input
          value={model.title}
          onChange={e => model.updateTitle(e.target.value)}
        />
      </div>
      <div>
        <label>Content:</label>
        <textarea
          value={model.content}
          onChange={e => model.updateContent(e.target.value)}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => history.back()} disabled={!history.hasPrev}>
          Undo
        </button>
        <button onClick={() => history.forward()} disabled={!history.hasNext}>
          Redo
        </button>
        <button onClick={() => history.reset()}>Reset</button>
        <button onClick={() => model.reset()}>Clear</button>
      </div>

      <div style={{ marginTop: "1rem", fontSize: "0.8em", color: "#666" }}>
        Can undo: {history.hasPrev ? "Yes" : "No"} | Can redo:{" "}
        {history.hasNext ? "Yes" : "No"}
      </div>
    </div>
  );
}
```

**Key points:**

- `useModelHistory` provides undo/redo functionality for better user experience.
- Suitable for text editors, form editing, and other scenarios requiring undo.
- Automatically tracks all field changes, including nested objects.
- Can be combined with form utilities to provide undo for forms.

---

## 10. Usage summary

- **Design models from scenarios**: write a short story of what the page/module should do, then derive needed fields and methods.
- **Components should call semantic methods only**: `increase`, `submitForm`, `loadList`, etc.; avoid directly mutating internal fields.
- Combine **loader, watch, form-utils, and history** to cover most typical admin/dashboard requirements without extra complex state libraries.
