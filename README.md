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

总的来说，easy-model 的优势是“组合性与简单性”：把 DI、响应式与加载逻辑合并到一组直观的 API 中，适合需要少量样板、希望快速落地的 React 应用。

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
