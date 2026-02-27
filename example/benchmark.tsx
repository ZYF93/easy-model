import { useMemo, useState } from "react";
import { useModel } from "../src";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import {
  Provider as ReduxProvider,
  useDispatch,
  useSelector,
} from "react-redux";
import { makeAutoObservable } from "mobx";
import { Observer, useLocalObservable } from "mobx-react-lite";
import { create as createZustand } from "zustand";

type Impl = "easy-model" | "redux" | "mobx" | "zustand";

const CASE_SIZE = 10_000;
const UPDATE_TIMES = 5;

// easy-model 实现
class EasyModelCounter {
  values: number[] = [];
  constructor(size: number) {
    this.values = Array.from({ length: size }, () => 0);
  }
  bumpMany(times: number) {
    const next = [...this.values];
    for (let t = 0; t < times; t++) {
      for (let i = 0; i < next.length; i++) {
        next[i] += 1;
      }
    }
    this.values = next;
  }
}

// Redux 实现
const reduxSlice = createSlice({
  name: "counter",
  initialState: {
    values: Array.from({ length: CASE_SIZE }, () => 0),
  },
  reducers: {
    bumpMany(state, action: { payload: number }) {
      const times = action.payload;
      for (let t = 0; t < times; t++) {
        for (let i = 0; i < state.values.length; i++) {
          state.values[i] += 1;
        }
      }
    },
  },
});

const reduxStore = configureStore({
  reducer: {
    counter: reduxSlice.reducer,
  },
});

// MobX 实现
class MobxCounter {
  values: number[] = [];
  constructor(size: number) {
    makeAutoObservable(this);
    this.values = Array.from({ length: size }, () => 0);
  }
  bumpMany(times: number) {
    for (let t = 0; t < times; t++) {
      for (let i = 0; i < this.values.length; i++) {
        this.values[i] += 1;
      }
    }
  }
}

// Zustand 实现
interface ZustandState {
  values: number[];
  bumpMany: (times: number) => void;
}

const useZustandStore = createZustand<ZustandState>((set, get) => ({
  values: Array.from({ length: CASE_SIZE }, () => 0),
  bumpMany(times) {
    const { values } = get();
    const next = [...values];
    for (let t = 0; t < times; t++) {
      for (let i = 0; i < next.length; i++) {
        next[i] += 1;
      }
    }
    set({ values: next });
  },
}));

function formatMs(ms: number | null) {
  if (ms == null || Number.isNaN(ms)) return "-";
  return `${ms.toFixed(1)}ms`;
}

export function BenchmarkPanel() {
  const [selected, setSelected] = useState<Impl>("easy-model");
  const [result, setResult] = useState<Partial<Record<Impl, number>>>({});

  const easyModel = useModel(EasyModelCounter, [CASE_SIZE]);
  const mobxState = useLocalObservable(() => new MobxCounter(CASE_SIZE));
  const zustandValues = useZustandStore(s => s.values);
  const zustandBumpMany = useZustandStore(s => s.bumpMany);

  const reduxValues = useSelector(
    (state: ReturnType<typeof reduxStore.getState>) => state.counter.values
  );
  const reduxDispatch = useDispatch<typeof reduxStore.dispatch>();

  const summary = useMemo(
    () => ({
      "easy-model": {
        size: easyModel.values.length,
        last: easyModel.values[0],
      },
      redux: {
        size: reduxValues.length,
        last: reduxValues[0],
      },
      mobx: {
        size: mobxState.values.length,
        last: mobxState.values[0],
      },
      zustand: {
        size: zustandValues.length,
        last: zustandValues[0],
      },
    }),
    [easyModel.values, reduxValues, mobxState.values, zustandValues]
  );

  function runOne(kind: Impl) {
    const t1 = performance.now();
    switch (kind) {
      case "easy-model":
        easyModel.bumpMany(UPDATE_TIMES);
        break;
      case "redux":
        reduxDispatch(reduxSlice.actions.bumpMany(UPDATE_TIMES));
        break;
      case "mobx":
        mobxState.bumpMany(UPDATE_TIMES);
        break;
      case "zustand":
        zustandBumpMany(UPDATE_TIMES);
        break;
    }
    const t2 = performance.now();
    const cost = t2 - t1;
    setResult(prev => ({ ...prev, [kind]: cost }));
  }

  function runAll() {
    (["easy-model", "redux", "mobx", "zustand"] as Impl[]).forEach(runOne);
  }

  return (
    <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
      <h3>Benchmark：批量更新 {CASE_SIZE.toLocaleString()} 个数字</h3>
      <p style={{ fontSize: 12, color: "#666" }}>
        每次点击会对数组中 {CASE_SIZE.toLocaleString()} 个元素进行{" "}
        {UPDATE_TIMES} 轮自增， 使用 <code>performance.now()</code>{" "}
        统计同步耗时（不包含 React 首次渲染时间，仅作粗略对比）。
      </p>
      <div style={{ marginBottom: 12 }}>
        <label>
          当前实现：
          <select
            value={selected}
            onChange={e => setSelected(e.target.value as Impl)}
            style={{ marginLeft: 8 }}
          >
            <option value="easy-model">easy-model</option>
            <option value="redux">Redux</option>
            <option value="mobx">MobX</option>
            <option value="zustand">Zustand</option>
          </select>
        </label>
        <button style={{ marginLeft: 12 }} onClick={() => runOne(selected)}>
          运行当前实现
        </button>
        <button style={{ marginLeft: 8 }} onClick={runAll}>
          运行全部实现
        </button>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>实现</th>
            <th style={{ textAlign: "right" }}>耗时（ms）</th>
            <th style={{ textAlign: "right" }}>数组长度</th>
            <th style={{ textAlign: "right" }}>首元素值</th>
          </tr>
        </thead>
        <tbody>
          {(["easy-model", "redux", "mobx", "zustand"] as Impl[]).map(kind => {
            const row = summary[kind];
            return (
              <tr key={kind}>
                <td>{kind}</td>
                <td style={{ textAlign: "right" }}>
                  {formatMs(result[kind] ?? null)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {row.size.toLocaleString()}
                </td>
                <td style={{ textAlign: "right" }}>{row.last}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BenchmarkApp() {
  return (
    <ReduxProvider store={reduxStore}>
      <Observer>{() => <BenchmarkPanel />}</Observer>
    </ReduxProvider>
  );
}
