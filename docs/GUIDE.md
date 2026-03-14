## easy-model 指南

> [English Version / 英文版](./GUIDE.en.md)

---

## 1. 设计理念与适用场景

- **核心理念**
  - **Model 承载业务，组件只负责视图**：把业务状态、计算逻辑、副作用封装到 model 中；React 组件尽量只做 UI 展示与事件绑定。
  - **以“类 + Hook”为中心**：通过普通 TypeScript 类描述领域对象，再结合 `useModel` / `useInstance` 等 Hook 把它们接入 React。
  - **组合式能力**：同一个 model 可以同时承担 **状态容器、依赖注入接受者、异步 loader、watch 监听源** 等角色。

- **推荐使用 easy-model 的场景**
  - 存在较多 **业务状态**（订单、用户、表单、权限等）并且需要在多个组件间共享。
  - 领域逻辑较重，不适合全部塞进组件或 hooks 中。
  - 希望兼顾 **可测试性、可维护性**，避免 Redux 类库的大量样板代码。

---

## 2. 项目结构与命名建议

- **目录结构（示例）**
  - 建议在前端项目中单独建立一个 `models` 目录集中放置业务 model，例如：
    - `src/models/user.ts`
    - `src/models/order.ts`
    - `src/models/dashboard.ts`
  - 每个文件聚焦一个领域，导出：
    - **model 类**：核心业务逻辑载体。
    - **可能的实例工厂 / Provider**：如基于 `provide` 封装的工厂函数。
    - **领域相关类型**：通过 `export type` 暴露。

- **命名规范**
  - **类名使用领域名**：如 `User` / `Order` / `Cart`。
  - **实例 / Provider 使用名词**：如 `user`, `order`, `createUserProvider`。
  - 避免在组件中直接 `new` model，统一使用 easy-model 的 Hook / Provider。

---

## 3. 定义 Model 的最佳实践

### 3.1 状态与派生数据

- **把业务 state 放在 model 上**
  - 示例：

```ts
class CounterModel {
  count = 0;
  label: string;

  constructor(initial = 0, label = "计数器") {
    this.count = initial;
    this.label = label;
  }
}
```

- **派生数据通过 getter / 方法暴露**
  - 不在组件中重复计算统计值、聚合数据：

```ts
class OrderModel {
  items: { price: number; count: number }[] = [];

  get totalPrice() {
    return this.items.reduce((sum, i) => sum + i.price * i.count, 0);
  }
}
```

### 3.2 语义化的业务方法

- **避免暴露“改字段”的底层操作**，只暴露语义化业务行为：
  - 如 `increaseCount()`、`submitOrder()`、`login()` 等，而不是 `setState(field, value)`。
  - 业务校验、边界处理都放在这些方法里，组件只负责调用。

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

### 3.3 类型与可维护性

- **类型集中在 model 中维护**
  - 领域对象（如用户、订单等）的类型定义放在对应 model 文件里，通过 `export type` 暴露。
  - 避免在组件或工具函数中重复手写结构相同的字面量类型。

- **避免 `any`**
  - model 的字段、方法入参/返回值尽量给出明确类型，方便 IDE 提示和重构。

---

## 4. 在 React 中使用 easy-model

### 4.1 `useModel`：创建/注入/共享 model 实例

- **适合场景**
  - 组件需要一个 **与组件生命周期相关** 的 model 实例，或按参数区分的多实例（如不同 tab 的 model）。
  - 跨组件共享 model 实例时

- **使用要点**
  - `useModel` 第一个参数是 model 类，第二个参数（可选）用于构造函数参数或区分 key。
  - model 中字段变化会自动触发使用它的组件重新渲染。

```ts
function CounterView() {
  const { label, count, decrement, increment } = useModel(CounterModel, [0, "示例"]);

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
    const { count } = useModel(CounterModel, [0, "示例"]);

  return <div>{count}</div>;
}
```

- **最佳实践**
  - 在组件中**只调用公开方法 / 读取公开字段**，不要在组件里拼装业务逻辑。

### 4.2 `provide` + `useInstance`：共享实例

- **适合场景**
  - 同一个 model 实例需要共享（例如跨区域通信、全局设置、系统状态等）。

- **使用模式**

```ts
// 定义 Provider 以及创建实例
const globalConfig = provide(GlobalConfigModel)("global");

// 组件 A：使用实例
function ConfigPanel() {
  const model = useInstance(globalConfig);
  // ...
}

// 组件 B：复用同一实例
function AnotherComponent() {
  const model = useInstance(globalConfig);
  // ...
}

// 非组件中复用同一实例
if (!globalConfig.ready) globalConfig.loadConf(); // ...
```

- **最佳实践**
  - 使用语义化的 key（如 `"global"`, `"current-user"`）区分不同实例。
  - 在 Provider 封装文件中统一管理 `provide` 调用，便于重构。

### 4.3 `useWatcher` / `watch`：监听变化做副作用

- **区别与适用场景**
  - `useWatcher(model, callback)`：在 React 组件内部监听 model 变化并执行副作用。
  - `watch(model, callback)`：在组件外（或 hooks 中）独立监听，适合跨组件日志上报、调试等。

- **使用示例（组件内 Watcher）**

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

  // 渲染省略...
}
```

- **最佳实践**
  - Watcher 只做“副作用”（日志、上报、同步到外部），尽量不要在回调中再去修改同一个 model，避免逻辑绕圈。

---

## 5. 异步与 loader 的最佳实践

### 5.1 使用 `loader.load` 包装异步方法

- **目的**
  - 自动收集当前方法的“加载中”状态，统一驱动全局或局部 loading UI。

- **典型用法**

```ts
class ProfileModel {
  constructor(public name: string) {}

  @loader.load(true) // true 表示参与全局 loading 统计
  async fetchProfile() {
    // 异步请求...
  }
}
```

- **建议**
  - 所有与“页面加载 / 提交操作”相关的异步方法，统一通过 `@loader.load` 包装。
  - 仅当需要全局遮罩或统一 loading 条时，才设置为 `true` 参与全局统计。

### 5.2 `useLoader`：在 UI 中使用加载状态

- **使用示例**

```ts
function LoaderDemo() {
  const { isGlobalLoading, isLoading } = useLoader();
  const profile = useModel(ProfileModel, ["profile"]);

  return (
    <div>
      <div>全局加载状态：{String(isGlobalLoading)}</div>
      <div>当前加载状态：{String(isLoading(profile.fetchProfile))}</div>
      <button onClick={() => profile.fetchProfile()} disabled={isGlobalLoading}>
        重新加载
      </button>
    </div>
  );
}
```

- **最佳实践**
  - 全局 loading（页面遮罩）：统一由 `isGlobalLoading` 决定。
  - 局部按钮 loading / 禁用：使用 `isLoading(model.method)` 精细控制。

---

## 6. 依赖注入（DI）建议

> 如果你在项目中使用 easy-model 提供的注入能力（如 `inject` 等装饰器），可参考本节。

- **统一通过注入拿依赖**
  - 将 HTTP 客户端、配置、路由器等外部依赖封装成可注入对象，在 model 中通过装饰器注入。
  - 避免在构造函数或方法中直接 `new` 依赖，以便测试和替换实现。

- **分层清晰**
  - model 只关心“调用接口”，具体实现（Mock / 真实接口）通过 DI 替换。
  - 结合 easy-model 的 Provider，可以在入口处注册不同环境的实现（例如开发/生产环境或单元测试时的假实现）。

---

## 7. 页面开发流程建议

- **1）先想清楚“这个页面的领域”**
  - 例如：用户中心、订单列表、看板等，确定是否对应已有 model。

- **2）优先复用 / 扩展现有 model**
  - 新需求落在已有领域时，优先在对应 model 中扩展字段或方法，而不是在组件里新增一堆本地 state。

- **3）组件中只做 3 件事**
  - 通过 `useModel` / `useInstance` 获取 model 实例。
  - 渲染 UI（包含必要的条件渲染、样式）。
  - 把交互事件（点击、输入等）委托给 model 公开方法。

- **4）异步与 loading 一次性接好**
  - 为异步方法加上 `@loader.load`。
  - 在页面级组件中通过 `useLoader` 绑定全局/局部 loading。

- **5）必要时加上 Watcher**
  - 项目早期就规划好哪些 model 需要日志 / 埋点，在关键页面里用 `useWatcher` 或全局 `watch` 补上。

---

## 8. 性能与调试建议

- **减少不必要的重渲染**
  - 将频繁变化但与当前组件无关的 state 放到其他 model 中，或拆分为更细粒度的 model。
  - 在组件中只读取真正需要的字段。

- **调试建议**
  - 利用 `watch` / `useWatcher` 打印关键字段的变化路径（例如 `keys.join(".")`），帮助排查“谁在改这个值”。
  - 为重要 model 提供简单的 `reset()` 或调试方法，方便在开发环境快速回滚状态。

---

## 9. 迁移与增量接入策略

- **从传统状态管理迁移**
  - 从“单个模块”开始，把某一块业务（如登录、用户信息）从 Redux / MobX / Zustand 等迁移到 easy-model。
  - 先完成 model 定义和 React 接入，再逐步下线原有 store 中的那部分逻辑。

- **增量引入的注意点**
  - 在项目文档中明确约定：新业务优先使用 easy-model，新老方案暂时并存。
  - 为常见需求（如鉴权、全局配置、通知等）提供通用 model 示例，降低团队上手成本。

---

## 10. 小结

- **抽象到 model，组件做纯视图**，是 easy-model 能够保持可维护性的关键。
- **统一通过 Hook / Provider 使用 model**，避免在各处手写 `new` 和手动管理生命周期。
- 善用 `loader`、`watch`、依赖注入等扩展能力，可以在不引入额外库的前提下完成绝大多数中后台项目的状态管理需求。

---

## 11. 表单工具（form-utils）

easy-model 提供了基于装饰器的表单字段配置工具集，帮助你在模型类中声明式地定义表单字段的元信息（如验证规则、权限、依赖关系等），并通过 `forUtils.getProps` 函数提取这些配置用于表单渲染。

### 11.1 核心装饰器

- **`@forUtils.prop(name)`**：设置字段的显示名称。
- **`@forUtils.required()`**：标记为必填字段。
- **`@forUtils.validate(fn)`**：设置验证函数，返回 `{ valid: boolean; message?: string }`。
- **`@forUtils.readonly()`**：标记为只读字段。
- **`@forUtils.permission(code)`**：设置权限代码。
- **`@forUtils.dependsOn(fn)`**：设置依赖条件函数，决定字段是否显示/启用。
- **`@forUtils.config(fieldConfig)`**：设置字段UI配置（如类型、宽度、选项等）。
- **`@forUtils.placeholder(text)`**：设置占位符文本。

### 11.2 使用示例

```ts
import { forUtils } from "easy-model";

class UserFormModel {
  @(forUtils
    .prop("用户名")
    .required()
    .validate(value => {
      if (typeof value !== "string" || value.length < 3) {
        return { valid: false, message: "用户名至少3个字符" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" })
    .placeholder("请输入用户名"))
  username = "";

  @(forUtils
    .prop("邮箱")
    .required()
    .validate(value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== "string" || !emailRegex.test(value)) {
        return { valid: false, message: "请输入有效的邮箱地址" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" })
    .placeholder("请输入邮箱"))
  email = "";

  @(forUtils
    .prop("年龄")
    .validate(value => {
      if (typeof value !== "number" || value < 0 || value > 120) {
        return { valid: false, message: "年龄必须在0-120之间" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "50%" })
    .placeholder("请输入年龄"))
  age = 0;

  @(forUtils.prop("管理员").config({ type: "checkbox", width: "auto" }))
  isAdmin = false;

  @(forUtils
    .prop("管理员代码")
    .dependsOn(function (this: UserFormModel) {
      return this.isAdmin; // 仅在 isAdmin 为 true 时显示
    })
    .required()
    .config({ type: "input", width: "100%" })
    .placeholder("管理员代码"))
  adminCode = "";

  @(forUtils
    .prop("角色")
    .permission(1)
    .config({
      type: "select",
      width: "100%",
      getOptions: () => ["user", "moderator", "admin"],
    }))
  role = "user";

  @(forUtils
    .prop("描述")
    .readonly()
    .config({ type: "textarea", width: "100%" })
    .placeholder("描述"))
  description = "这是一个只读字段";
}

// 获取表单配置
const formProps = forUtils.getProps(UserFormModel);
```

### 11.3 在组件中使用

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

### 11.4 最佳实践

- **链式调用**：所有装饰器支持链式调用，按需组合配置。
- **类型安全**：充分利用 TypeScript 的类型推断，避免运行时错误。
- **依赖关系**：使用 `dependsOn` 处理字段间的依赖逻辑。
- **权限控制**：通过 `permission` 实现字段级别的权限管理。

---

## 12. 历史记录管理（history）

easy-model 提供了内置的历史记录管理功能，可以自动跟踪模型的变化，并支持撤销/重做操作。这对于需要撤销功能的表单、编辑器等场景非常有用。

### 12.1 核心 API

- **`collect(model)`**：为指定模型创建历史记录管理器实例。
- **`useModelHistory(model)`**：React Hook，返回模型的历史管理器，方便在组件中使用。

### 12.2 History 实例方法

- **`hasPrev`**: boolean - 是否有前一步历史
- **`hasNext`**: boolean - 是否有后一步历史
- **`back()`**: 撤销到上一步
- **`forward()`**: 重做到下一步
- **`reset()`**: 重置到初始状态

### 12.3 使用示例

```tsx
import { useModel, useModelHistory } from "easy-model";

class CounterModel {
  count = 0;
  label = "计数器";

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
      <h2>
        {counter.label}: {counter.count}
      </h2>
      <button onClick={() => counter.decrement()}>-</button>
      <button onClick={() => counter.increment()}>+</button>

      <div>
        <button onClick={() => history.back()} disabled={!history.hasPrev}>
          撤销
        </button>
        <button onClick={() => history.forward()} disabled={!history.hasNext}>
          重做
        </button>
        <button onClick={() => history.reset()}>重置到初始状态</button>
      </div>
    </div>
  );
}
```

### 12.4 工作原理

- 每次模型字段变化时，自动记录变更路径和值
- `back()` 会将模型恢复到上一个状态
- `forward()` 会前进到下一个记录的状态
- `reset()` 会一次性恢复所有变更，回到初始状态
- 支持嵌套对象的变更跟踪

### 12.5 最佳实践

- **用户体验**：在需要撤销功能的界面中提供撤销/重做按钮。
- **性能考虑**：历史记录会占用内存，长时间运行的应用可以定期清理历史。
- **边界处理**：在撤销/重做操作前后检查 `hasPrev`/`hasNext` 状态。
- **组合使用**：可以与表单工具结合，为表单提供撤销功能。
