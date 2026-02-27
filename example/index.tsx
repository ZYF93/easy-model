import { createRoot } from "react-dom/client";
import { useModel, useWatcher } from "../src";
import { useState } from "react";

// 一个简单的 model 类，包含状态和方法
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
  // 使用 useModel 创建/注入 model 实例（会在 model 变更时触发组件更新）
  const counter = useModel(CounterModel, [0, "示例"]);
  const [changed, setChanged] = useState([
    [] as (string | symbol)[],
    0,
    0,
  ] as const);

  // useWatcher 用于对 model 的变化执行副作用（例如日志、同步到外部）
  useWatcher(counter, (...args) => {
    setChanged(args);
  });

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h2>{counter.label}</h2>
      <div style={{ fontSize: 24, margin: "12px 0" }}>{counter.count}</div>
      <div style={{ fontSize: 24, margin: "12px 0" }}>
        <div>
          counter changed {`->`} keys:{changed[0].join(",")}
        </div>
        <div>prev: {changed[1]}</div>
        <div>current: {changed[2]}</div>
      </div>
      <button onClick={() => counter.decrement()}>-</button>
      <button onClick={() => counter.increment()} style={{ marginLeft: 8 }}>
        +
      </button>
    </div>
  );
}

function App() {
  const counter = useModel(CounterModel, [0, "示例"]);
  return (
    <div>
      <h1>useModel、useWatcher 示例</h1>
      <Counter />
      <h2>{counter.count}</h2>
    </div>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
