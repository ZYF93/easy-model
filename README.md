# easy-model

轻量级的 React 状态管理与依赖注入库。

easy-model 专注于在 React 中提供简洁、高效的状态管理，减少样板代码并保持良好的可组合性。

---

## 特性

- 极简 API：基于 Hook 的使用方式，易上手、易迁移。
- 依赖注入：内置简单的容器，支持按类型/命名空间注入与清理。
- 响应式观察：`watch` 支持对对象变化进行监听并触发更新。
- Loader：统一的异步数据加载与缓存机制，搭配 `useLoader` 使用。
- 体积小、无侵入：适合大中小型项目或逐步引入到现有项目中。

---

## 安装

推荐使用 `pnpm`：

```bash
pnpm add @e7w/easy-model
```

或使用 `npm` / `yarn`：

```bash
npm install @e7w/easy-model
yarn add @e7w/easy-model
```

开发（安装依赖并运行测试）：

```bash
pnpm install
pnpm test
```

（如需启动示例项目，使用 Vite 的 `pnpm dev`，请参考 `package.json` 脚本。）

---

## 快速上手（React）

下面演示核心用法，适合在函数组件中使用：

```tsx
import React from "react";
import {
  provide,
  useModel,
  loader,
  useLoader,
  inject,
  watch,
} from "easy-model";

class Counter {
  count = 0;
}

// 组件中读取并响应模型变化
function Counter() {
  const model = useModel(Counter, []);
  return (
    <div>
      <button onClick={() => model.count--}>-</button>
      <span>{model.count}</span>
      <button onClick={() => model.count++}>+</button>
    </div>
  );
}

// 异步 loader 示例
class Photos {
  @loader.load(true)
  data = [];
  async fetcher() {
    const res = await fetch("/api/photos");
    this.data = res.json();
  }
}

function Gallery() {
  const { data, fetcher } = useModel(Photos, []);
  const { isGlobalLoading, isLoading } = useLoader();
  useEffect(() => {
    fetcher();
  }, [fetcher]);
  if (isGlobalLoading) return <div>全局loading</div>;
  if (isLoading(fetcher)) return <div>本函数loading...</div>;
  return (
    <ul>
      {data.map((p: any) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

// 依赖注入示例（类/服务）
const schema = object({
  number: number(),
}).describe("测试用schema");
const schema2 = object({
  xxx: number(),
}).describe("Test类的schema");

class Test {
  xxx = 1;
}
class MFoo {
  @inject(schema)
  bar?: Infer<typeof schema>;
  baz?: number;
  @inject(schema2)
  qux?: Infer<typeof schema2>;
}

config(
  <>
    <Container>
      <CInjection schema={schema2} ctor={Test} />
      <VInjection
        schema={schema}
        val={{
          number: 100,
        }}
      />
    </Container>
  </>
);

const Foo = provide(MFoo);
let foo: MFoo | undefined = Foo();
foo.baz = 20;
document.writeln(JSON.stringify(foo.bar));
document.writeln(String(foo.baz));
document.writeln(JSON.stringify(foo.qux));
```

更多示例见项目自带的 [example](example).

---

## API（概览）

- `watch` — 响应式监听函数。
- `provide`, `finalizationRegistry` — 提供和清理模型/服务。
- `useModel`, `useInstance`, `useWatcher` — React Hook，用于绑定模型或自定义观察者。
- `loader`, `useLoader` — 异步加载器与 Hook。
- `Container`, `CInjection`, `VInjection`, `inject`, `clearNamespace`, `isRegistered`, `config` — IoC/容器与注入相关工具。

---

## 与常见库对比（简要）

- Redux：
  - Redux 适合大型、严格的全局状态管理，具有强大的中间件生态，但模板代码较多（actions/reducers）。
  - easy-model 更轻量，基于对象与 Hook，适合快速开发，整合 DI 和 loader，减少样板代码。

- MobX：
  - MobX 提供细粒度响应式，学习曲线较低。easy-model 提供类似的响应式监听器和 Hook，但 API 更显式，集成 DI 更方便。

- Zustand：
  - Zustand 也很小巧，以 store 函数为中心。easy-model 的优势在于：内建依赖注入、loader 管理与更直接的对象模型（常见类/实例注入更友好）。

- React Context：
  - Context 适合简单传递，性能需配合 memo/selector 优化。easy-model 提供专门的 Hook 与内部优化，减少组件重新渲染并支持按需注入。

总的来说，easy-model 的优势可以概括为：

- **组合性强**：同一套模型既可以作为 React 状态容器，又可以作为依赖注入的服务，还可以挂载 loader / watch 等逻辑，减少在多个库之间来回穿梭。
- **API 简单、一致**：以“类 + Hook”为中心（`useModel` / `useInstance`），不需要额外的 action、reducer 或复杂的装饰器配置，迁移成本低。
- **性能可接受且易优化**：在典型的批量更新场景中，相比 Redux 有数量级的性能优势，同时通过内部的批量调度与轻量级响应式实现，保证在多数业务场景下不会成为性能瓶颈。
- **渐进式引入友好**：无需改造全局 store，可以从单个模块/页面开始使用模型类和 Hook，逐步替换原有状态管理方案。

### 简单 benchmark 结论

项目在 `example/benchmark.tsx` 中提供了一个**粗略的**对比示例，核心场景为：

- 初始化一个包含 10,000 个数字的数组；
- 点击按钮后，对所有元素做 5 轮自增；
- 使用 `performance.now()` 统计这段同步计算与状态写入时间（不计入 React 首屏渲染）。

在一台常规开发机上的一次测试结果（单位：ms，取单次运行的代表值）大致如下：

| 实现       | 耗时（ms） | 说明                                 |
| ---------- | ---------- | ------------------------------------ |
| easy-model | ≈ 3.1      | 基于类实例 + `observe` 的响应式模型 |
| Redux      | ≈ 51.5     | `createSlice` + Immer 不可变更新     |
| MobX       | ≈ 16.9     | `makeAutoObservable` + observer      |
| Zustand    | ≈ 0.6      | 极简 store 函数实现                  |

从这个场景可以得到几个结论（仅作趋势参考）：

- **对比 Redux**：easy-model 在该批量场景中大约比 Redux 快一个数量级（\~3ms vs \~50ms），同时完全避免了 action / reducer 等模板代码，更新路径更直接。
- **对比 MobX**：easy-model 与 MobX 属于同一数量级，前者以更简单的 Hook API + DI/loader 一体化为主打，后者在响应式生态上更成熟。
- **对比 Zustand**：Zustand 在这个极简数组场景下可以做到非常小的开销；easy-model 并不以“单一场景下绝对最快”为目标，而是在保持性能可接受的前提下，提供更丰富的能力组合（依赖注入、loader、watch 等）。

整体来说：

- 在常见的批量更新场景里，**easy-model 相比 Redux 有明显的性能和开发体验优势**；
- 与 MobX / Zustand 相比，easy-model 的优势更多体现在**组合能力与 API 一致性**：一套模型可以同时承担状态管理、依赖注入和异步加载，而不需要在多个库之间来回切换。

> 说明：该 benchmark 仅为示例级别，不是严谨的基准测试。不同设备、浏览器和实现细节都会显著影响具体数值，建议按需 clone 仓库后自行在本地运行 `pnpm dev`，并在示例页面的 “Benchmark” 区块里手动对比。

---

## 开发 & 测试

运行测试：

```bash
pnpm install
pnpm test
```

查看示例：打开 `example/index.tsx` 并参考 `vite`/`npm` 脚本运行本地示例（一般为 `pnpm dev`）。

---

## 贡献

欢迎提交 issue 和 PR。请遵循项目的代码风格与测试约定。若要运行或修改示例，请先安装依赖并运行 `pnpm test` 验证现有用例。

---

## 许可证

MIT
