## easy-model 场景 Cookbook

本文以“场景配方”的形式，给出一些常见业务场景在 easy-model 下的实现思路与套路。示例均为伪代码级别，重点是模式而不是具体字段。

---

## 1. 简单计数器（入门模板）

### 1.1 Model 设计

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

### 1.2 组件使用

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

**要点：**

- 从一开始就把逻辑写在 model 里，而不是 `useState`；后续要扩展（加上上限、统计、埋点）会更容易。

---

## 2. 表单场景（本地校验 + 提交）

### 2.1 Model 设计

目标：一个简单登录表单，有用户名、密码、本地校验与提交。

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
      this.setError("请检查用户名和密码");
      return;
    }
    // 调用服务层（伪代码）
    // await authService.login({ username: this.username, password: this.password });
  }
}
```

### 2.2 组件使用

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

      {!form.isValid && <div>请完整填写表单</div>}
      {form.error && <div>{form.error}</div>}

      <button type="submit">登录</button>
    </form>
  );
}
```

**要点：**

- 表单校验逻辑集中在 model 中，组件只负责展示错误信息和调用 `submit`。
- 需要时可以在 `submit` 中加入埋点、重定向等逻辑，不会污染组件。

---

## 3. 列表 + 筛选 + 分页

### 3.1 Model 设计

典型的“表格页”场景：列表数据、筛选条件、分页信息。

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
    // 伪代码：调用服务层
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

### 3.2 组件使用

```tsx
function ListPage() {
  const list = useModel(ListModel);

  useEffect(() => {
    list.load();
  }, [list.page, list.keyword]);

  return (
    <div>
      <input
        placeholder="搜索关键字"
        value={list.keyword}
        onChange={e => list.changeKeyword(e.target.value)}
      />

      {!list.hasData && <div>暂无数据</div>}

      {/* 列表渲染略 */}

      {/* 分页组件略，onChange 中调用 list.changePage */}
    </div>
  );
}
```

**要点：**

- 筛选条件、分页信息都集中在 model 中，组件只关心“当前状态”和“触发动作”。
- 如果有多个页面需要相似的列表逻辑，可以通过继承或组合复用 `ListModel`。

---

## 4. 全局用户信息与登录态

### 4.1 Model 设计

```ts
class UserModel {
  token: string | null = null;
  profile: { name: string } | null = null;

  get isLoggedIn() {
    return Boolean(this.token);
  }

  async login(username: string, password: string) {
    // 调用登录接口，伪代码
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

### 4.2 全局 Provider

```ts
const UserProvider = provide(UserModel);
```

### 4.3 在应用入口与页面中使用

```tsx
function App() {
  const user = useInstance(UserProvider("global"));

  if (!user.isLoggedIn) {
    return <LoginView />;
  }

  return <MainLayout />;
}
```

**要点：**

- 使用 `provide` + `useInstance` 创建一个全局用户实例，任何页面都可以拿到最新用户状态。
- 所有和登录态相关的逻辑（token 管理、信息获取等）集中在 `UserModel` 中。

---

## 5. 全局 loading 与按钮级 loading

### 5.1 Model 中使用 loader

```ts
class ProfileModel {
  profile: { name: string } | null = null;

  @loader.load(true)
  async fetchProfile() {
    // 伪代码
    // this.profile = await userService.fetchProfile();
  }
}
```

### 5.2 组件中使用 loading 状态

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
      {isGlobalLoading && <div>全局加载中...</div>}

      <button onClick={() => model.fetchProfile()} disabled={loadingCurrent}>
        {loadingCurrent ? "加载中..." : "刷新资料"}
      </button>

      {model.profile && <div>{model.profile.name}</div>}
    </div>
  );
}
```

**要点：**

- `@loader.load(true)` 表示这个异步方法会影响全局 loading 状态。
- `isGlobalLoading` 控制全局级 UI（遮罩、顶部进度条等），`isLoading(fn)` 控制局部 loading。

---

## 6. 通知 / 消息中心

### 6.1 Model 设计

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

### 6.2 全局 Provider 与展示组件

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
          <button onClick={() => notify.remove(m.id)}>关闭</button>
        </div>
      ))}
    </div>
  );
}
```

任何需要发通知的地方，只需要：

```ts
const notify = useInstance(NotifyProvider("global"));
notify.push({ type: "success", text: "操作成功" });
```

**要点：**

- 通知的展示与发起场景解耦，高度复用。
- 通过 easy-model 保证所有通知都来自同一份 state。

---

## 7. Watcher 场景：调试与埋点

### 7.1 在组件内监听（`useWatcher`）

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

  // 渲染 log 省略
}
```

### 7.2 在组件外监听（`watch`）

```ts
const counter = provide(CounterModel)();

const stop = watch(counter, (keys, prev, next) => {
  // 上报埋点或打印日志
});

// 不再需要时调用 stop()
stop();
```

**要点：**

- Watcher 更适合做“观测”和“记录”，尽量不要在回调里再修改同一个 model，避免逻辑难以追踪。

---

## 8. 使用建议小结

- **从场景出发设计 model**：先写 Story（这个页面/模块要做什么），再确定需要哪些字段和方法。
- **组件只调用语义化方法**：`increase` / `submitForm` / `loadList`，尽量不要随意改内部字段。
- **loader、watch、Provider 这些能力组合使用**，可以覆盖绝大多数中后台的典型需求，无需额外引入复杂状态管理方案。
