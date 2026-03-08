## easy-model 在项目中的架构实践

本文说明在一个典型的 React / TypeScript 项目中，如何围绕 easy-model 组织代码结构与分层，让团队在中长期演进中保持可维护性。

---

## 1. 适用工程类型

- **中后台管理系统 / 控制台**
  - 多个菜单页面、列表 + 详情、筛选、图表、表单提交等。
- **面向业务流程的应用**
  - 有清晰的业务领域（用户、订单、商品、报表等），需要跨页面共享状态和逻辑。
- **组件较多、协作开发的项目**
  - 希望通过统一约定降低认知成本，方便新人快速接手。

这些项目的共同特点是：**业务状态比 UI 复杂**，因此适合用 easy-model 把“领域状态 + 领域逻辑”抽出来集中管理。

---

## 2. 推荐目录结构

以一个典型的前端项目为例（可按需调整）：

```txt
src/
  models/           # 业务模型（easy-model 核心）
    user.ts
    order.ts
    dashboard.ts

  pages/            # 页面级组件（通常对应路由）
    user/
      index.tsx
    order/
      index.tsx

  components/       # 纯展示或复用组件
    common/
      Button.tsx
      Table.tsx

  services/         # 与后端交互的封装（API、SDK 等）
    http.ts
    user-api.ts
    order-api.ts

  hooks/            # 与具体业务无关的通用 hooks
    useDebounce.ts
    useMediaQuery.ts

  utils/            # 工具函数、常量等
    format.ts
    constants.ts
```

- **`models/`**
  - 存放所有基于 easy-model 的领域模型。
  - 每个文件对应一个相对独立的领域（用户、订单、仪表盘等）。
- **`pages/`**
  - 负责组合模型、路由和视图。
  - 不直接写复杂业务逻辑，只调用 model 的方法。
- **`components/`**
  - 偏通用、偏展示，可复用。
  - 尽量不直接依赖具体业务 model，而是通过 props 接收数据与回调。
- **`services/`**
  - 提供 HTTP 请求封装、接口定义、与后端交互的细节。
  - model 通常依赖这些服务而不是直接使用 `fetch/axios`。

---

## 3. 分层关系与依赖方向

从“内核”到“外层”建议的依赖方向：

```txt
services → models → pages → components
```

- **services（服务层）**
  - 包含请求后端、访问本地存储、调用 SDK 等“外部世界”的能力。
  - 不依赖任何 model，只提供纯函数或类。

- **models（领域模型层）**
  - 通过 easy-model 封装业务状态与逻辑。
  - 可以依赖 `services`，但不要反过来。
  - 尽量不依赖具体页面或组件，只提供与领域相关的方法。

- **pages（页面层）**
  - 使用路由 / 布局，负责把一个或多个 model 组合起来驱动页面。
  - 通过 `useModel` / `useInstance` 获取 model 实例，通过 `useLoader` / `useWatcher` 等进行协作。

- **components（组件层）**
  - 可以是纯展示组件（最好是无状态）或轻量 wrapper。
  - 对 easy-model 保持无感知，由上层页面通过 props 传入数据与事件。

> 经验法则：**越靠内层的模块，越不应该依赖外层**。model 不应该知道“自己是在哪个页面被用的”，只关心“自己负责哪块业务”。

---

## 4. 一个页面从路由到视图的完整链路

以“订单列表页”为例，一个推荐的调用链路是：

1. **路由与页面组件**
   - 路由配置指向 `pages/order/index.tsx`。
   - 页面组件内使用 `useModel(OrderListModel, [...args])` 获取 model。
2. **页面逻辑**
   - 在 `useEffect` 或用户操作中调用 model 方法（如 `loadList()`、`changeFilter()`）。
   - 使用 `useLoader` 获取 loading 状态，控制全局或局部 loading。
   - 将 model 的字段/派生数据传给下层展示组件。
3. **Model 与服务层**
   - `OrderListModel` 内部注入/依赖 `order-api`，调用后端接口。
   - 通过 `@loader.load` 标记异步方法，自动记录加载状态。
4. **展示组件**
   - 只关心列表数据、分页信息、回调函数等，不关心 easy-model 细节。

大致结构示意：

```txt
Route → Page(OrderPage)
      → useModel(OrderListModel)
          ↘ services/order-api

Page → 展示组件（Table、FilterBar 等）
```

这样可以做到：

- 调试时只需要看某个 model 文件就能理解一块业务。
- 页面只负责组装，不会越写越“巨石”。

---

## 5. Model 内部结构建议

一个典型的 model 文件建议包含：

1. **领域类型定义**
   - 如订单项、过滤条件、分页信息等。
2. **状态字段**
   - 纯数据字段，用于存储当前状态。
3. **派生属性（getter）**
   - 对状态进行计算，输出统计值/视图数据。
4. **业务方法**
   - 对外导出语义化操作，例如 `loadList` / `applyFilter` / `reset`。
5. **异步方法与 loader**
   - 用 `@loader.load` 包装涉及网络请求或耗时操作的方法。

> 建议：**在 model 中保持“小而清晰”的接口**，避免暴露太多“半成品”数据结构，让页面层读起来尽量像“调用业务 API”而不是“手工组装 state”。

---

## 6. 与 React 生态的集成方式

- **与 React Router 集成**
  - 页面组件通过路由加载，内部使用 easy-model。
  - 与路由参数（如 `id`）相关的 model，可以把参数作为 `useModel` 的构造参数传入。

- **与全局布局 / 顶层组件集成**
  - 一些全局唯一并且可能在组件之外有副作用的 model 实例（例如用户信息、全局配置）可以通过 `provide` 提供统一实例。
  - 页面通过 `useInstance` 复用该实例。

- **与 UI 库集成**
  - easy-model 并不依赖具体 UI 库（例如 Ant Design、MUI、Tailwind 等），只提供状态与行为。
  - 尽量保持 model 无 UI 依赖，让你可以随时更换 UI 库。

---

## 7. 团队协作与演进建议

- **约定统一**
  - 在团队 README 或架构文档中明确：业务状态优先写在 easy-model 中。
  - 约定 `models/` 下的命名、目录组织方式，避免同一业务分散在多个目录。

- **Code Review 要点**
  - 新增复杂逻辑时，优先检查是否应该放到 model 中。
  - 检查页面是否只通过 model 方法/字段完成业务，不在组件里堆 if/for 逻辑。
  - 检查异步方法是否正确使用 loader，以维持 loading 体验一致性。

- **演进策略**
  - 老项目迁移时，可以从一个领域开始引入 easy-model（例如用户或登录），逐步替换原有状态管理方案。
  - 新业务模块尽量按照本文的结构和依赖方向来搭建，避免“混搭式”的架构越来越难维护。
