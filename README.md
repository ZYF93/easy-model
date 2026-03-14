# easy-model

> [English Version / 英文版说明](./README.en.md)

**easy-model** 是一个围绕「类模型（Model Class）+ 依赖注入 + 精细化变更监听」构建的 React 状态管理与 IoC 工具集。你可以用普通的 TypeScript 类描述业务模型，通过少量 API 即可：

- **在函数组件中直接创建 / 注入模型实例**（`useModel` / `useInstance`）
- **跨组件共享同一实例**，支持按参数分组实例缓存（`provide`）
- **监听模型及其嵌套属性的变化**（`watch` / `useWatcher`）
- **用装饰器和 IoC 容器做依赖注入**（`Container` / `CInjection` / `VInjection` / `inject`）
- **统一管理异步调用的加载状态**（`loader` / `useLoader`）

相比 Redux / MobX / Zustand，easy-model 的目标是：**保持接近类 OOP 的心智模型，同时提供较好的性能和类型体验，并内建 IoC 能力。**

### 核心特性一览

- **类模型驱动（Class-based Model）**  
  直接用 TypeScript 类描述业务：字段即状态，方法即业务逻辑，没有额外的 action / reducer ceremony。

- **按参数缓存实例（Instance by arguments）**  
  使用 `provide` 包装后，相同参数获取的是同一实例，不同参数获取不同实例，天然支持「按业务 key」分区的状态。

- **深层变更监听（Deep watch）**  
  `watch` / `useWatcher` 可以监听到：
  - 模型自身字段的变化；
  - 嵌套对象属性变化；
  - 实例之间的嵌套 / 引用关系变化；
  - getter 返回的衍生实例的变化。

- **React Hooks 友好**
  - `useModel`：在组件中创建并订阅模型；
  - `useInstance`：在组件中订阅已有实例；
  - `useWatcher`：在函数组件中挂载监听回调；
  - `useLoader`：统一获取全局 loading 状态及单个方法的 loading 状态。

- **IoC 容器与依赖注入**
  - 使用 `Container` / `CInjection` / `VInjection` / `config` 配置注入；
  - 使用 `inject` 装饰器在类中按 schema 声明依赖；
  - 支持 namespace 隔离与 `clearNamespace` 清理。

### 示例（example/）

`example/` 目录包含运行时示例，可帮助快速理解 API。下面是几个「直给」的核心用法片段。

- **基础计数器：`useModel` / `useWatcher`**（见 `example/index.tsx`）  
  使用 `CounterModel` 展示如何在函数组件中创建模型实例、读取 / 更新字段，并监听变更：

  ```tsx
  import { useModel, useWatcher } from "easy-model";

  class CounterModel {
    count = 0;
    label: string;
    constructor(initial = 0, label = "计数器") {
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
    const counter = useModel(CounterModel, [0, "示例"]);

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

- **跨组件通信：`useModel` + `useInstance`**  
  通过 `CommunicateModel` + `provide`，让多个组件共享同一实例（按参数分组）：

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
        <span>组件 A：{value}</span>
        <button onClick={random}>改变数值</button>
      </div>
    );
  }

  function CommunicateB() {
    const { value } = useInstance(CommunicateProvider("channel")); // 这里用useModel也可以，这里是演示一下useInstance的使用方法
    return <div>组件 B：{value}</div>;
  }
  ```

- **独立监听：`watch`**  
  在 React 外部或普通函数中监听某个实例，将变更记录到日志列表中：

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
  // 不再需要时取消监听
  stop();
  ```

- **跳过监听：`offWatch`**  
  使用 `@offWatch` 装饰器跳过对特定字段的监听，以提高性能：

  ```tsx
  import { provide, watch, offWatch } from "easy-model";

  class OffWatchModel {
    constructor(public name: string) {}
    value = 0;
    @offWatch
    internalCounter = 0;

    increment() {
      this.value += 1;
      this.internalCounter += 1;
    }
  }

  const OffWatchProvider = provide(OffWatchModel);
  const inst = OffWatchProvider("offwatch-demo");

  const stop = watch(inst, (keys, prev, next) => {
    console.log(`${keys.join(".")}: ${prev} -> ${next}`);
  });

  inst.increment();
  // 只输出 value 的变更，internalCounter 被跳过
  stop();
  ```

- **异步加载与全局 Loading：`loader` / `useLoader`**  
  通过装饰器标记异步方法，并在组件中读取全局 / 单方法 loading 状态：

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
        <div>全局加载状态：{String(isGlobalLoading)}</div>
        <div>当前加载状态：{String(isLoading(inst.fetch))}</div>
        <button onClick={() => inst.fetch()} disabled={isGlobalLoading}>
          触发一次异步加载
        </button>
      </div>
    );
  }
  ```

- **依赖注入示例：`example/inject.tsx`**  
  展示了如何用 zod schema 描述依赖，并通过容器完成注入：

  ```tsx
  import {
    CInjection,
    Container,
    VInjection,
    config,
    inject,
  } from "easy-model";
  import { object, number } from "zod";

  const schema = object({ number: number() }).describe("测试用schema");

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

- **Benchmark 示例：`example/benchmark.tsx`**  
  提供 easy-model / Redux / MobX / Zustand 在同一场景下的**粗略性能对比面板**，下文有详细说明。

### 测试（test/）

`test/` 目录使用 Vitest + React Testing Library 覆盖了核心行为：

- **provide 与实例缓存**
  - 相同参数返回同一实例；
  - 不同参数返回不同实例。

- **watch 的深层监听能力**
  - 监听简单字段变更；
  - 监听嵌套对象属性变更；
  - 处理实例之间的嵌套引用关系；
  - 支持 getter 返回实例（如 `child2`）的变更路径监听。

- **IoC 配置与命名空间**
  - 通过 `config` + `Container` + `CInjection` / `VInjection` 注册依赖；
  - `isRegistered` 判断指定 schema 是否已在某个 namespace 注册；
  - `clearNamespace` 清理命名空间中的注册项。

- **Hooks 行为**
  - `useModel` + `useInstance` 在两个组件间共享状态并同步更新 UI；
  - `useWatcher` 在函数组件中监听模型变化；
  - `loader` + `useLoader` 正确反映全局 / 单个方法的 loading 状态。

### 表单工具（form-utils）

easy-model 提供了基于装饰器的表单字段配置工具集，帮助你在模型类中声明式地定义表单字段的元信息（如验证规则、权限、依赖关系等），并通过 `getProps` 函数提取这些配置用于表单渲染。

#### 核心 API

- **装饰器链式调用**：所有装饰器支持链式调用，按需组合配置。
  - `@forUtils.prop(name)`：设置字段的显示名称。
  - `@forUtils.required()`：标记为必填字段。
  - `@forUtils.validate(fn)`：设置验证函数，返回 `{ valid: boolean, message?: string }`。
  - `@forUtils.readonly()`：标记为只读字段。
  - `@forUtils.permission(code)`：设置权限代码。
  - `@forUtils.dependsOn(fn)`：设置依赖条件函数，决定字段是否显示/启用。
  - `@forUtils.config(fieldConfig)`：设置字段UI配置（如类型、宽度、选项等）。
  - `@forUtils.placeholder(text)`：设置占位符文本。

- **getProps(ctor)**：从类构造函数提取所有字段配置，返回配置数组。

#### 示例用法

```tsx
import { forUtils } from "easy-model";

// 定义表单模型
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
      if (!emailRegex.test(value)) {
        return { valid: false, message: "请输入有效的邮箱地址" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" }))
  email = "";

  @(forUtils
    .prop("年龄")
    .validate(value => {
      if (value < 0 || value > 120) {
        return { valid: false, message: "年龄必须在0-120之间" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "50%" }))
  age = 0;

  @(forUtils.prop("管理员").config({ type: "checkbox", width: "auto" }))
  isAdmin = false;

  @(forUtils
    .prop("管理员代码")
    .dependsOn(function (this: UserFormModel) {
      return this.isAdmin; // 仅在 isAdmin 为 true 时显示
    })
    .required()
    .config({ type: "input", width: "100%" }))
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
}

// 获取表单配置
const formProps = forUtils.getProps(UserFormModel);

// 在组件中使用
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

#### 字段配置类型

`fieldConfig` 支持以下类型：

- **input**: 文本输入框 `{ type: "input", width: string }`
- **textarea**: 多行文本框 `{ type: "textarea", width: string }`
- **select**: 下拉选择 `{ type: "select", width: string, getOptions(): string[] | Promise<string[]> }`
- **checkbox**: 复选框 `{ type: "checkbox", width: string }`
- **radio**: 单选框 `{ type: "radio", width: string, getOptions(): string[] | Promise<string[]> }`

#### 测试覆盖

- 装饰器正确设置字段属性（prop、required、validate 等）；
- 链式调用按预期组合配置；
- `dependsOn` 依赖条件函数正确执行；
- `getProps` 正确提取所有字段配置。

### 历史记录管理（history）

easy-model 提供了内置的历史记录管理功能，可以自动跟踪模型的变化，并支持撤销/重做操作。这对于需要撤销功能的表单、编辑器等场景非常有用。

#### 核心 API

- **collect(model)**：为指定模型创建历史记录管理器实例。
- **useModelHistory(model)**：React Hook，返回模型的历史管理器，方便在组件中使用。

#### History 实例方法

- **hasPrev**: boolean - 是否有前一步历史
- **hasNext**: boolean - 是否有后一步历史
- **back()**: 撤销到上一步
- **forward()**: 重做到下一步
- **reset()**: 重置到初始状态

#### 示例用法

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
      <button onClick={() => counter.increment()}>+</button>
      <button onClick={() => counter.decrement()}>-</button>

      <div>
        <button onClick={() => history.back()} disabled={!history.hasPrev}>
          撤销
        </button>
        <button onClick={() => history.forward()} disabled={!history.hasNext}>
          重做
        </button>
        <button onClick={() => history.reset()}>重置</button>
      </div>
    </div>
  );
}
```

#### 工作原理

- 每次模型字段变化时，自动记录变更路径和值
- `back()` 会将模型恢复到上一个状态
- `forward()` 会前进到下一个记录的状态
- `reset()` 会一次性恢复所有变更，回到初始状态
- 支持嵌套对象的变更跟踪

#### 测试覆盖

- 基础的撤销/重做功能
- 重置到初始状态
- 嵌套对象变更的处理
- 与 useModel 的集成

### 与 Redux / MobX / Zustand 的对比

下表是从「心智模型 / 用法复杂度 / 性能 & 能力边界」等角度对比 easy-model 与常见方案：

| 方案           | 编程模型                 | 典型心智负担                                                       | 内建 IoC / DI          | 性能特征（本项目场景）                  |
| -------------- | ------------------------ | ------------------------------------------------------------------ | ---------------------- | --------------------------------------- |
| **easy-model** | 类模型 + Hooks + IoC     | 写类 + 写方法即可，少量 API（`provide` / `useModel` / `watch` 等） | 是                     | 在极端批量更新下仍为**个位数毫秒**      |
| **Redux**      | 不可变 state + reducer   | 需要 action / reducer / dispatch 等模板代码                        | 否                     | 在同场景下为**数十毫秒级**              |
| **MobX**       | 可观察对象 + 装饰器      | 对响应式系统有一定学习成本，隐藏的依赖追踪                         | 否（偏响应式而非 IoC） | 性能优于 Redux，但仍是**十几毫秒级**    |
| **Zustand**    | Hooks store + 函数式更新 | API 简洁，偏轻量，适合局部状态                                     | 否                     | 在本场景下是**最快**，但不提供 IoC 能力 |

从项目角度看，easy-model 的特点在于：

- **对比 Redux**：
  - 不需要拆分 action / reducer / selector，业务逻辑直接写在模型方法里；
  - 避免大量模板代码，类型推断更直接（基于类字段和方法签名）；
  - 自动处理实例缓存与变更订阅，无需手动 connect / useSelector。

- **对比 MobX**：
  - 保留类模型的直觉优势，同时用显式 API（`watch` / `useWatcher`）暴露依赖关系；
  - 依赖注入、命名空间、清理等能力是 easy-model 的一等公民，而非额外工具。

- **对比 Zustand**：
  - 性能接近（在本项目 benchmark 中 easy-model 仍处于个位数毫秒），但提供更完整的 IoC / DI / deep watch 组合能力；
  - 更适合中大型、需要明确领域模型和依赖关系的项目，而不仅是「轻量局部状态 store」。

### Benchmark 场景说明（与 Redux / MobX / Zustand 的粗略性能对比）

在 `example/benchmark.tsx` 中，项目提供了一个**简单且偏极端**的 benchmark，用来在同一台机器上粗略比较不同状态管理方案在「大量同步写入」场景下的表现。核心场景为：

1. **初始化一个包含 10,000 个数字的数组**；
2. 点击按钮后，对所有元素做 **5 轮自增**；
3. 使用 `performance.now()` 统计这段**同步计算与状态写入**时间；
4. **不计入 React 首屏渲染时间**，仅关注每次点击触发的计算 + 状态写入耗时。

在一台常规开发机上的一次测试结果（单位：ms，取单次运行的代表值）大致如下（数值可能因环境而异，仅供参考）：

| 实现           | 耗时（ms） |
| -------------- | ---------- |
| **easy-model** | ≈ 3.1      |
| **Redux**      | ≈ 51.5     |
| **MobX**       | ≈ 16.9     |
| **Zustand**    | ≈ 0.6      |

需要特别强调：

- **这是一个刻意放大的「批量更新」场景**，主要目的是放大不同实现之间在「大量同步写入 + 通知」路径上的差异；
- 结果会受到：浏览器 / Node 版本、硬件性能、打包模式等多种因素影响，因此这里只能作为**趋势性的参考**，而非严谨的性能报告；
- Zustand 在这个场景下表现最好，这是符合其「极简 store + 函数式更新」定位的；
- easy-model 虽然在这类极端场景下略慢于 Zustand，但**仍明显快于 Redux / MobX**，同时提供：
  - 类模型 + IoC + 深度监听等高级能力；
  - 更适合中大型业务的结构化编码体验。

### 项目链接与关键词

- **GitHub 仓库**: [`ZYF93/easy-model`](https://github.com/ZYF93/easy-model)
- **npm 包**: [`@e7w/easy-model`](https://www.npmjs.com/package/@e7w/easy-model)
- **关键词**: `react` / `state management` / `state manager` / `ioc` / `dependency injection` / `class model` / `react hooks` / `watcher` / `loader` / `typescript`

### 适用场景

easy-model 更适合以下类型的项目：

- 领域模型清晰、希望用类来承载业务状态与方法；
- 需要在各处优雅地做依赖注入（如仓储、服务、配置、schema 等）；
- 对「监听某个模型 / 某个嵌套字段的变化」有较强需求；
- 希望在保证结构化代码与可维护性的同时，获得接近轻量状态库的性能。

如果你目前在使用 Redux / MobX / Zustand，想要：

- 减少心智负担和模板代码；
- 获得更自然的类模型与 IoC 能力；
- 又不希望在性能上明显吃亏；

那么可以尝试将部分模块迁移到 easy-model，并先在 `example/benchmark.tsx` 中实际运行一次 benchmark，观察在你的机器和真实业务数据规模下的表现。

### 进一步文档（docs/）

本仓库还提供了一些更偏「工程实践 / 使用手册」的中文文档，建议在真实项目中优先参考：

- [GUIDE](./docs/GUIDE.md)：整体最佳实践指南，涵盖设计理念、model 设计、React 集成、loader / watcher 使用等。
- [ARCHITECTURE](./docs/ARCHITECTURE.md)：在实际项目中如何围绕 easy-model 组织目录结构与分层。
- [COOKBOOK](./docs/COOKBOOK.md)：按场景分类的实践配方（表单、列表、全局用户、通知中心等）。
- [FAQ](./docs/FAQ.md)：常见问题与排查思路。

当你在工程实践层面有「应该怎么拆 model」「页面应该怎么组织」「某个场景推荐怎么写」这类问题时，可以直接跳转到上述文档查阅，避免在 README 中重复维护同样的信息。
