import { createRoot } from "react-dom/client";
import {
  provide,
  useInstance,
  useModel,
  useWatcher,
  watch,
  loader,
  useLoader,
} from "../src";
import { useEffect, useState } from "react";

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
      <button onClick={random} style={{ marginLeft: 8 }}>
        改变数值
      </button>
    </div>
  );
}

function CommunicateB() {
  const { value } = useInstance(CommunicateProvider("channel"));
  return <div>组件 B：{value}</div>;
}

class WatchModel {
  constructor(public name: string) {}
  value = 0;
}

const WatchProvider = provide(WatchModel);

function WatchDemo() {
  const inst = WatchProvider("watch-demo");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const stop = watch(inst, (keys, prev, next) => {
      setLog(list => [
        ...list,
        `${keys.join(".")}: ${String(prev)} -> ${String(next)}`,
      ]);
    });
    return stop;
  }, [inst]);

  return (
    <div>
      <div>当前值：{inst.value}</div>
      <button
        onClick={() => {
          inst.value += 1;
        }}
      >
        +1
      </button>
      <ul style={{ marginTop: 8 }}>
        {log.map((item, idx) => (
          <li key={idx} style={{ fontSize: 12 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

class LoaderModel {
  constructor(public name: string) {}
  @loader.load(true)
  async fetch() {
    return new Promise<number>(resolve => setTimeout(() => resolve(42), 1000));
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

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>easy-model 示例</h1>

      <section id="counter" style={{ marginBottom: 32 }}>
        <h2>useModel / useWatcher 计数器</h2>
        <Counter />
      </section>

      <section id="communication" style={{ marginBottom: 32 }}>
        <h2>useInstance 跨组件通信</h2>
        <CommunicateA />
        <CommunicateB />
      </section>

      <section id="watch" style={{ marginBottom: 32 }}>
        <h2>watch 独立监听示例</h2>
        <WatchDemo />
      </section>

      <section id="loader" style={{ marginBottom: 32 }}>
        <h2>loader / useLoader 全局加载状态</h2>
        <LoaderDemo />
      </section>
    </div>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
