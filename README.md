# easy-model

一个功能强大的 React 状态管理库，集成了状态管理、IoC 容器、观察者模式和加载器等功能。

## 特性

- 🚀 **简单易用** - 基于类的状态管理，直观的 API 设计
- 🔄 **响应式** - 自动观察状态变化，精确更新组件
- 💉 **IoC 容器** - 内置依赖注入容器，支持命名空间隔离
- 🎯 **类型安全** - 完整的 TypeScript 支持，基于 Zod 的运行时类型验证
- ⚡ **性能优化** - 智能缓存和垃圾回收机制
- 🔧 **加载状态管理** - 内置异步操作加载状态管理
- 🧩 **模块化** - 可按需使用各个功能模块

## 安装

```bash
npm install @e7w/easy-model
# 或
yarn add @e7w/easy-model
# 或
pnpm add @e7w/easy-model
```

## 核心概念

### 1. 状态管理

基于类的状态管理，支持自动观察和响应式更新。

```tsx
import { useModel } from "@e7w/easy-model";

class CounterModel {
  constructor(public name: string) {}

  count = 0;

  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  reset() {
    this.count = 0;
  }
}

function Counter() {
  const { count, increment, decrement, reset } = useModel(CounterModel, [
    "main",
  ]);

  return (
    <div>
      <h2>计数器: {count}</h2>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>重置</button>
    </div>
  );
}
```

### 2. IoC 容器

内置的依赖注入容器，支持值注入、构造函数注入和装饰器注入。

```tsx
import { Container, VInjection, CInjection, inject } from "@e7w/easy-model";
import { z } from "zod";

// 定义配置 schema
const configSchema = z.object({
  apiUrl: z.string(),
  timeout: z.number(),
});

const loggerSchema = z.object({
  log: z.function(),
});

// 定义服务类
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

class ApiService {
  @inject(configSchema)
  config: z.infer<typeof configSchema> = { apiUrl: "", timeout: 0 };

  @inject(loggerSchema)
  logger: Logger | undefined;

  async fetchData() {
    this.logger?.log(`Fetching data from ${this.config.apiUrl}`);
    // 实际的 API 调用逻辑
  }
}

function App() {
  return (
    <Container namespace="app">
      {/* 注入配置值 */}
      <VInjection
        schema={configSchema}
        val={{ apiUrl: "https://api.example.com", timeout: 5000 }}
      />

      {/* 注入构造函数 */}
      <CInjection schema={loggerSchema} ctor={Logger} />

      <YourComponents />
    </Container>
  );
}
```

### 3. 观察者模式

手动观察对象变化，适用于非 React 环境。注意：`observe` 函数是内部实现，不对外导出。

```tsx
import { watch } from "@e7w/easy-model";

// 注意：observe 函数未导出，这里仅作为概念说明
// 实际使用中，观察功能已集成在 useModel 和 useInstance 中

// 监听对象变化的概念示例（实际需要通过 useModel 等方式）
const unwatch = watch(someObservableObject, (path, oldValue, newValue) => {
  console.log(`属性 ${path.join(".")} 从 ${oldValue} 变为 ${newValue}`);
});

// 取消监听
unwatch();
```

### 4. 加载状态管理

内置的异步操作加载状态管理，支持全局和局部加载状态。

```tsx
import { loader } from "@e7w/easy-model";

class DataService {
  data: any[] = [];

  @loader.load(true) // true 表示全局加载状态
  async fetchData() {
    const response = await fetch("/api/data");
    this.data = await response.json();
    return this.data;
  }

  @loader.load() // 局部加载状态
  async updateItem(id: string, updates: any) {
    const response = await fetch(`/api/data/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  @loader.once() // 只执行一次的异步操作
  async initializeApp() {
    // 初始化逻辑
  }
}

function DataComponent() {
  const service = useModel(DataService, []);
  const { globalLoading } = useModel(loader, []);

  return (
    <div>
      {globalLoading > 0 && <div>全局加载中...</div>}
      <button onClick={() => service.fetchData()}>加载数据</button>
      {service.data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## API 参考

### 状态管理

#### `useModel<T>(Constructor: T, args: ConstructorParameters<T>): InstanceType<T>`

创建或获取模型实例，自动观察状态变化并更新组件。

**参数:**

- `Constructor`: 模型类构造函数
- `args`: 构造函数参数数组

**返回值:** 模型实例，包含所有属性和方法

#### `useInstance<T>(instance: T): T`

直接使用现有实例，自动观察状态变化。

**参数:**

- `instance`: 要观察的对象实例

**返回值:** 观察后的实例

#### `provide<T>(Constructor: T): T`

为类提供实例缓存和观察功能。

**参数:**

- `Constructor`: 要包装的类构造函数

**返回值:** 包装后的构造函数，支持实例缓存

### IoC 容器

#### `Container`

IoC 容器组件，提供依赖注入的上下文环境。

**Props:**

- `namespace?: string` - 命名空间，用于隔离不同的依赖注入环境
- `children: ReactNode` - 子组件

#### `VInjection<T>`

值注入组件，将值注入到容器中。

**Props:**

- `schema: ZodType<T>` - Zod schema，用于类型验证
- `val: T` - 要注入的值

#### `CInjection<T>`

构造函数注入组件，将构造函数注入到容器中。

**Props:**

- `schema: ZodType<T>` - Zod schema，用于类型验证
- `ctor: new () => T` - 要注入的构造函数

#### `inject<T>(schema: ZodType<T>, namespace?: string)`

装饰器函数，用于从容器中注入依赖到类属性。

**参数:**

- `schema: ZodType<T>` - Zod schema，用于类型验证
- `namespace?: string` - 可选的命名空间

**返回值:** 装饰器函数

### 观察者模式

#### `watch(target: object, callback: WatchCallback): () => void`

监听对象的变化。

**参数:**

- `target: object` - 要监听的对象
- `callback: WatchCallback` - 变化时的回调函数

**返回值:** 取消监听的函数

**WatchCallback 类型:**

```typescript
type WatchCallback = (
  path: Array<string | symbol>,
  oldValue: any,
  newValue: any
) => void;
```

### 加载器

#### `loader.load(isGlobal?: boolean)`

异步方法装饰器，自动管理加载状态。

**参数:**

- `isGlobal?: boolean` - 是否影响全局加载状态，默认为 false

**返回值:** 方法装饰器

#### `loader.once()`

确保异步方法只执行一次的装饰器。

**返回值:** 方法装饰器

#### `loader.isLoading(target: Function): boolean`

检查指定方法是否正在加载中。

**参数:**

- `target: Function` - 要检查的方法

**返回值:** 是否正在加载

#### `loader.isGlobalLoading: boolean`

获取全局加载状态。

**返回值:** 是否有全局加载正在进行

#### `loader.globalLoading: number`

获取当前全局加载的数量。

**返回值:** 正在进行的全局加载数量

#### `finalizationRegistry(model: object)`

为模型注册垃圾回收回调。

**参数:**

- `model: object` - 要监听垃圾回收的对象

**返回值:** 包含 `register` 和 `unregister` 方法的对象

## 高级用法

### 组件间通信

```tsx
// 全局状态模型
class AppState {
  user: User | null = null;
  theme: "light" | "dark" = "light";

  setUser(user: User) {
    this.user = user;
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
  }
}

// 在任何组件中使用
function Header() {
  const { user, theme, toggleTheme } = useModel(AppState, []);

  return (
    <header className={theme}>
      <span>欢迎, {user?.name}</span>
      <button onClick={toggleTheme}>切换主题</button>
    </header>
  );
}

function Sidebar() {
  const { user } = useModel(AppState, []); // 同一个实例

  return <aside>{user && <UserProfile user={user} />}</aside>;
}
```

### 嵌套模型

```tsx
class UserModel {
  constructor(public id: string) {}

  name = "";
  email = "";

  updateProfile(data: Partial<UserModel>) {
    Object.assign(this, data);
  }
}

class TeamModel {
  members: UserModel[] = [];

  addMember(userId: string) {
    const user = provide(UserModel)(userId);
    this.members.push(user);
  }

  removeMember(userId: string) {
    this.members = this.members.filter(m => m.id !== userId);
  }
}

function TeamManagement() {
  const team = useModel(TeamModel, ["team-1"]);

  return (
    <div>
      <h2>团队成员</h2>
      {team.members.map(member => (
        <UserCard key={member.id} user={member} />
      ))}
    </div>
  );
}

function UserCard({ user }: { user: UserModel }) {
  const observedUser = useInstance(user);

  return (
    <div>
      <span>{observedUser.name}</span>
      <span>{observedUser.email}</span>
    </div>
  );
}
```

### 命名空间隔离

```tsx
function App() {
  return (
    <div>
      {/* 开发环境配置 */}
      <Container namespace="dev">
        <VInjection schema={configSchema} val={devConfig} />
        <DevTools />
      </Container>

      {/* 生产环境配置 */}
      <Container namespace="prod">
        <VInjection schema={configSchema} val={prodConfig} />
        <MainApp />
      </Container>
    </div>
  );
}
```

## 最佳实践

### 1. 模型设计

- **单一职责**: 每个模型类应该只负责一个特定的业务领域
- **不可变更新**: 尽量使用不可变的方式更新状态
- **类型安全**: 充分利用 TypeScript 的类型系统

```tsx
// ✅ 好的实践
class UserModel {
  constructor(public id: string) {}

  private _profile: UserProfile | null = null;

  get profile() {
    return this._profile;
  }

  updateProfile(updates: Partial<UserProfile>) {
    this._profile = { ...this._profile, ...updates };
  }
}

// ❌ 避免的实践
class BadModel {
  // 避免在模型中直接操作 DOM
  updateUI() {
    document.getElementById("user-name")!.textContent = this.name;
  }
}
```

### 2. 依赖注入

- **明确依赖**: 使用 Zod schema 明确定义依赖的类型
- **命名空间**: 使用命名空间隔离不同环境的配置
- **懒加载**: 只在需要时注入依赖

### 3. 性能优化

- **合理使用参数**: 相同参数会返回相同实例，利用这一点进行优化
- **避免过度观察**: 不要观察不必要的对象
- **及时清理**: 使用 `finalizationRegistry` 进行资源清理

## 类型定义

```typescript
// 主要导出的类型
export interface WatchCallback {
  (path: Array<string | symbol>, oldValue: any, newValue: any): void;
}

export interface FinalizationRegistry {
  register(callback: () => void): void;
  unregister(): void;
}

export interface LoaderInstance {
  loading: Record<symbol, [Function, Promise<unknown>]>;
  globalLoading: number;
  load(isGlobal?: boolean): MethodDecorator;
  once(): MethodDecorator;
}
```

## 兼容性

- **React**: >= 17.0.0
- **TypeScript**: >= 4.5.0
- **Zod**: ^4.1.5

## 许可证

MIT License - 详见 [LICENSE.md](./LICENSE.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)
