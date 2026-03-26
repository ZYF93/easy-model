# AI Agent 使用指南

> 本文件旨在帮助 AI Agent 快速理解并使用 easy-model 库进行代码生成。

## 快速开始

```tsx
import { useModel, provide, watch, loader } from "easy-model";

// 1. 定义 Model 类
class CounterModel {
  count = 0;

  increment() {
    this.count += 1;
  }
}

// 2. 在组件中使用
function Counter() {
  const counter = useModel(CounterModel, []);
  return <button onClick={() => counter.increment()}>{counter.count}</button>;
}
```

## AI 编码模式

### 模式1：简单状态管理

```tsx
class TodoModel {
  todos: Todo[] = [];
  filter: "all" | "active" | "completed" = "all";

  add(todo: string) {
    this.todos.push({ id: Date.now(), text: todo, done: false });
  }

  toggle(id: number) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done;
  }

  get filteredTodos() {
    return this.todos.filter(t =>
      this.filter === "all" ? true : this.filter === "active" ? !t.done : t.done
    );
  }
}
```

### 模式2：API 调用 + Loading 状态

```tsx
class UserModel {
  users: User[] = [];
  loading = false;

  @loader.load()
  async fetchUsers() {
    this.loading = true;
    try {
      const res = await fetch("/api/users");
      this.users = await res.json();
    } finally {
      this.loading = false;
    }
  }
}

function UserList() {
  const model = useModel(UserModel, []);
  const { isLoading } = useLoader();

  useEffect(() => {
    model.fetchUsers();
  }, []);

  return (
    <div>
      {isLoading(model.fetchUsers) && <Spinner />}
      {model.users.map(u => (
        <div key={u.id}>{u.name}</div>
      ))}
    </div>
  );
}
```

### 模式3：跨组件共享状态

```tsx
// 组件 A：创建/更新状态
function UserForm() {
  const { name, setName } = useModel(User, ["user-1"]);
  return <input value={name} onChange={e => setName(e.target.value)} />;
}

// 组件 B：读取相同状态
function UserDisplay() {
  const { name } = useModel(User, ["user-1"]);
  return <span>{name}</span>;
}
```

### 模式4：依赖注入

```tsx
import { CInjection, Container, config, inject } from "easy-model";
import { object, string } from "zod";

// 定义 Schema 作为依赖标识
const apiSchema = object({
  baseUrl: string(),
  timeout: number(),
}).describe("API配置");

// 在类中使用 @inject
class ApiService {
  @inject(apiSchema)
  config?: { baseUrl: string; timeout: number };

  async request(path: string) {
    return fetch(`${this.config?.baseUrl}${path}`, {
      signal: AbortSignal.timeout(this.config?.timeout || 5000),
    });
  }
}

class Config {
  constructor(public baseUrl: string) {}
  timeOut = 5000;
}

// 注册值依赖
config(
  <Container>
    <VInjection
      schema={apiSchema}
      val={{ baseUrl: "https://api.example.com", timeout: 5000 }}
    />
  </Container>
);
// 或者注册类依赖
config(
  <Container>
    <CInjection
      schema={apiSchema}
      ctor={Config}
      params={["https://api.example.com"]}
    />
  </Container>
);
```

### 模式5：撤销/重做

```tsx
function Editor() {
  const editor = useModel(EditorModel, []);
  const history = useModelHistory(editor);

  return (
    <div>
      <textarea
        value={editor.content}
        onChange={e => (editor.content = e.target.value)}
      />
      <button onClick={() => history.back()} disabled={!history.hasPrev}>
        撤销
      </button>
      <button onClick={() => history.forward()} disabled={!history.hasNext}>
        重做
      </button>
    </div>
  );
}
```

### 模式6：监听状态变化

```tsx
// 全局监听
const stop = watch(model, (keys, prev, next) => {
  console.log(`${keys.join(".")} 变了:`, prev, "→", next);
});

// 组件内监听 (自动清理)
function MyComponent() {
  useWatcher(model, (keys, prev, next) => {
    console.log("变化了:", keys);
  });
}
```

## AI 常见任务模板

### 模板1：CRUD 页面

```tsx
class CRUDModel {
  items: Item[] = [];
  loading = false;
  selected: Item | null = null;

  @loader.load()
  async fetchAll() {
    this.items = await api.getAll();
  }

  @loader.load()
  async create(item: Item) {
    const created = await api.create(item);
    this.items.push(created);
  }

  @loader.load()
  async update(id: number, item: Item) {
    const updated = await api.update(id, item);
    const idx = this.items.findIndex(i => i.id === id);
    if (idx >= 0) this.items[idx] = updated;
  }

  delete(id: number) {
    this.items = this.items.filter(i => i.id !== id);
  }

  select(item: Item | null) {
    this.selected = item;
  }
}
```

### 模板2：表单 + 验证

```tsx
class FormModel {
  data = { name: "", email: "" };
  errors: Record<string, string> = {};

  setField(field: keyof typeof this.data, value: string) {
    this.data[field] = value;
    this.validateField(field);
  }

  validateField(field: string) {
    if (field === "email" && !this.data.email.includes("@")) {
      this.errors.email = "邮箱格式不正确";
    } else {
      delete this.errors[field];
    }
  }

  validateAll() {
    this.errors = {};
    if (!this.data.name) this.errors.name = "名称不能为空";
    if (!this.data.email) this.errors.email = "邮箱不能为空";
    return Object.keys(this.errors).length === 0;
  }

  submit() {
    if (this.validateAll()) {
      console.log("提交:", this.data);
    }
  }
}
```

### 模板3：分页列表

```tsx
class ListModel {
  items: Item[] = [];
  loading = false;
  pagination = { page: 1, size: 20, total: 0 };
  filters = { keyword: "" };

  @loader.load()
  async fetch() {
    this.loading = true;
    const res = await api.list({
      page: this.pagination.page,
      size: this.pagination.size,
      ...this.filters,
    });
    this.items = res.data;
    this.pagination.total = res.total;
  }

  setPage(page: number) {
    this.pagination.page = page;
    this.fetch();
  }

  setFilter(key: string, value: string) {
    this.filters[key] = value;
    this.pagination.page = 1;
    this.fetch();
  }
}
```

### 模板4：AI Agent 状态管理

```tsx
class AIAgentModel {
  messages: Message[] = [];
  status: "idle" | "thinking" | "streaming" | "tool" = "idle";
  currentToolCall: ToolCall | null = null;

  @loader.load()
  async sendMessage(content: string) {
    this.messages.push({ role: "user", content });
    this.status = "thinking";

    const response = await llm.chat(this.messages);

    if (response.toolCalls) {
      this.status = "tool";
      for (const call of response.toolCalls) {
        this.currentToolCall = call;
        const result = await executeTool(call);
        this.messages.push({ role: "tool", content: result });
      }
    } else {
      this.messages.push({ role: "assistant", content: response.content });
    }

    this.status = "idle";
  }
}
```

## 快速参考

| 需求         | 解决方案                                                 |
| ------------ | -------------------------------------------------------- |
| 组件共享状态 | `useModel(ModelClass, [args])`                           |
| 组件共享实例 | `provide(Model)` + `useInstance(Provider(...args))`      |
| 异步加载状态 | `@loader.load()` + `useLoader()`                         |
| 依赖注入     | `@inject(schema)` + `config(<Container>...)`             |
| 撤销重做     | `useModelHistory(model)`                                 |
| 监听变化     | `watch(model, callback)` / `useWatcher(model, callback)` |
| 非响应字段   | `@offWatch` 装饰器                                       |

## 注意事项

1. **可以解构 model**：`<div>{model.count}</div>` 也可以是 `const { count } = model`
2. **使用带参数的 provide**：同一个类的不同参数会创建不同实例
3. **async 方法要用 @loader.load**：这样才能用 `isLoading()` 获取状态
4. **依赖注入需要提前 config**：在应用入口配置好依赖

---

[GitHub](https://github.com/ZYF93/easy-model) | [npm](https://www.npmjs.com/package/@e7w/easy-model)
