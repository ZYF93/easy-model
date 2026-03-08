## easy-model 常见问题（FAQ）

> [English Version / 英文版](./FAQ.en.md)

本文整理了一些在使用 easy-model 过程中容易遇到的问题与建议解法，方便快速排查与沟通。

---

## 1. 字段变了为什么组件没有重新渲染？

**可能原因：**

- 没有通过 `useModel` / `useInstance` 获取实例，而是手动 `new` 了一个 model。
- 在组件中对 model 做了“脱离响应式”的解构，例如：
  - `const { count } = useModel(CounterModel, []);` 然后后续只用 `count`。
  - 这样之后即使 model 内部 `count` 更新，组件也不会感知到。
- 修改的是一个普通对象，而不是 model 中被代理的字段（例如把外部对象直接挂在 model 上并原地修改）。

**建议写法：**

- 始终通过 `useModel` / `useInstance` 获取实例：

```tsx
const { count } = useModel(CounterModel, []);
return <div>{count}</div>;
```

---

## 2. 什么时候应该用 easy-model，什么时候不用？

**适合用 easy-model 的情况：**

- 同一份业务状态需要在多个组件或页面中共享。
- 业务逻辑复杂（涉及多步流程、校验、异步调用、状态流转等）。
- 需要一套可测试、可复用的“领域模型”，而不希望逻辑散落在组件、hooks、工具函数中。

**不一定需要 easy-model 的情况：**

- 完全局部的小组件，只在组件内部用到的轻量状态（如“开关是否展开”、“当前 tab 索引”等），用 `useState` 就足够。
- 一次性 demo 或非常简单的表单，没有明显的复用/演进需求。

经验做法：**当你在组件里开始写越来越多 if/for/计算逻辑时，就可以考虑把这块逻辑抽成一个 model。**

---

## 3. `watch` 和 `useWatcher` 有什么区别？

- **`useWatcher(model, callback)`**
  - 只能在 React 组件内使用。
  - 生命周期跟随组件：组件挂载时开始监听，卸载时自动停止。
  - 适合在组件中做渲染相关的副作用（例如记录当前值的变更历史）。

- **`watch(instance, callback)`**
  - 可在组件外单独使用。
  - 返回一个 `stop` 函数，需要手动调用来停止监听。
  - 更适合全局日志、埋点、调试等与具体组件无关的场景。

简单理解：**`useWatcher` 是“组件版 watch”，主要处理与 UI 紧密相关的副作用；`watch` 更偏底层和全局。**

---

## 4. loader 的 `@loader.load` 到底做了什么？和 `useLoader` 怎么配合？

- 给某个异步方法加上 `@loader.load` 装饰后，easy-model 会在方法执行期间：
  - 记录该方法对应的“加载 token”。
  - 在 `useLoader()` 返回的 `isLoading(target)` 中可查询到这个方法当前是否在加载。
  - 可选地（当配置为全局时）增加/减少全局 loading 计数。

- 在组件中通过：

```ts
const { isGlobalLoading, isLoading } = useLoader();
const model = useModel(SomeModel);

const localLoading = isLoading(model.someAsyncMethod);
```

就可以实现：

- 全局 loading（如页面遮罩、顶部进度条）：用 `isGlobalLoading` 决定是否显示。
- 单个按钮 loading：用 `isLoading(model.someAsyncMethod)` 控制当前按钮的 disabled / loading 状态。

> 常见误区：只在组件里维护 `useState` 的 loading 标志，而没有复用 loader，导致一个异步操作触发多个 loading 状态，很难统一管理。

---

## 5. 我需要自己写 `useCallback` / `useMemo` 吗？

easy-model 关注的是 **状态与领域逻辑** 的组织，本身不会禁止你使用 React 的性能优化手段。

- 如果组件 props 传的是 model 字段或方法本身，通常 React 的重渲染成本是可接受的。
- 当遇到性能瓶颈时，可以考虑：
  - 在组件外使用 `memo` 包裹纯展示组件。
  - 对传入子组件的回调使用 `useCallback` 固定引用。

**经验法则：**

- 优先把“减少无意义重渲染”的工作交给合理的组件拆分和 model 设计，而不是一开始就在全局铺满 `useCallback`。

---

## 6. Model 里能不能直接操作 DOM 或调用浏览器 API？

不建议。

- Model 更适合作为“纯业务层”，只关心数据和流程。
- 直接操作 DOM / 使用浏览器 API（如 `window.location`）更适合放在：
  - 组件中（基于使用场景）。
  - 或封装成专门的 service 再由 model 间接调用。

**推荐做法：**

- 需要路由跳转？在 model 中注入一个“导航服务”，由服务封装具体实现（例如使用 React Router）。
- 需要本地存储？在 `services` 中封装一个 storage 工具，而不是在 model 中随处 `localStorage.setItem`。

---

## 7. 一个页面里可以用多个 model 吗？会不会很乱？

完全可以，而且在复杂页面中是常态。

典型例子：

- 一个“订单详情页”可能同时使用：
  - 订单主信息 model
  - 支付信息 model
  - 评论/评分 model

**组织方式建议：**

- 在页面组件顶部使用多个 `useModel` / `useInstance`：

```tsx
const order = useModel(OrderModel, []);
const payment = useModel(PaymentModel, []);
const comment = useModel(CommentModel, []);
```

- 再将它们拆分传递给子组件，保持每个子组件只关心自己领域的 model 或数据。

关键是：**每个 model 清楚自己负责什么，页面只是把它们组合在一起。**

---

## 8. 如何做单元测试？需要起 React 环境吗？

不需要。

- easy-model 的 model 本质上是普通的 TypeScript 类，状态和方法都可以直接操作。
- 通常可以在“非 React 环境”下直接使用 provider 初始化 model，然后断言：

```ts
test("counter works", () => {
  const counter = provide(CounterModel)();
  counter.increment();
  expect(counter.count).toBe(1);
});
```

当 model 依赖外部服务时：

- 把外部依赖抽象成接口，在测试中传入 mock 实现；
- 或者在 DI 容器中注册一个测试专用的实现。

> 只有在测试 `useModel` / `useInstance` 与组件协作行为时，才需要 React 测试环境。

---

## 9. 迁移老项目时，从哪里开始比较好？

推荐从 **边界清晰、依赖少的模块** 开始：

- 比如登录模块、用户信息模块、某个相对独立的小页面。

大致步骤：

1. 选定一个模块，将其业务状态和逻辑抽成一个 model。
2. 页面使用 `useModel` 替代原有的 Redux / MobX / Zustand / Context 调用。
3. 在保持功能不变的前提下，逐步删除原有状态管理方案中该模块的代码。
4. 重复以上步骤，逐步覆盖更多模块。

关键点：**每次只动一块业务，保证改动可控、易回滚。**

---

## 10. 出现问题时，排查顺序怎么走？

一个简单的排查 Checklist：

1. **组件是否通过 `useModel` / `useInstance` 获取 model？**
2. **model 方法是否真的被调用了？（可以暂时在里边加上 `console.log` 或 watch）**
3. **异步方法是否被 `await` 或正确使用 loader？**
4. **是否在多个地方维护了重复的状态？（例如组件自己 `useState` + model 里也有同名字段）**

如果确认问题来自 easy-model 的行为，可以：

- 用 `watch` 或 `useWatcher` 打印关键字段变化。
- 在最小可复现场景下写一份小 demo，对比预期行为与实际行为。
