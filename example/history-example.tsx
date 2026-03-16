import { useModel, useModelHistory } from "../src";

class CounterModel {
  count = 0;
  label = "计数器";

  increment() {
    this.count += 1;
  }

  decrement() {
    this.count -= 1;
  }

  reset() {
    this.count = 0;
  }
}

export default function HistoryExample() {
  const counter = useModel(CounterModel, []);
  const history = useModelHistory(counter);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>历史记录示例</h2>
      <p>演示使用 useModelHistory 进行撤销/重做操作。</p>

      <div style={{ marginBottom: "1rem" }}>
        <h3>计数器: {counter.label}</h3>
        <div style={{ fontSize: "2rem", margin: "1rem 0" }}>
          {counter.count}
        </div>
        <div>
          <button
            onClick={() => counter.decrement()}
            style={{ marginRight: "0.5rem" }}
          >
            -
          </button>
          <button
            onClick={() => counter.increment()}
            style={{ marginRight: "0.5rem" }}
          >
            +
          </button>
          <button onClick={() => counter.reset()}>重置为0</button>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h3>历史操作</h3>
        <div>
          <button
            onClick={() => history.back()}
            disabled={!history.hasPrev}
            style={{ marginRight: "0.5rem" }}
          >
            撤销
          </button>
          <button
            onClick={() => history.forward()}
            disabled={!history.hasNext}
            style={{ marginRight: "0.5rem" }}
          >
            重做
          </button>
          <button
            onClick={() => history.reset()}
            style={{ marginRight: "0.5rem" }}
          >
            重置到初始状态
          </button>
          <button
            onClick={() =>
              history.batch(() => {
                counter.increment();
                counter.increment();
              })
            }
            style={{ marginRight: "0.5rem" }}
          >
            批量 +2 并合并为一条历史
          </button>
          <button onClick={() => history.clear()}>清空历史</button>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <span>可以撤销: {history.hasPrev ? "是" : "否"}</span>
          <span style={{ marginLeft: "1rem" }}>
            可以重做: {history.hasNext ? "是" : "否"}
          </span>
        </div>
      </div>

      <div>
        <h3>使用说明</h3>
        <ul>
          <li>点击 +/- 按钮改变计数器值</li>
          <li>每次改变都会记录到历史中</li>
          <li>点击"撤销"回到上一步状态</li>
          <li>点击"重做"前进到下一步状态</li>
          <li>点击"重置到初始状态"回到最开始的状态</li>
          <li>点击"批量 +2 并合并为一条历史"可将多个修改合并为一条记录</li>
          <li>点击"清空历史"清空所有历史记录，无法再撤销或重做</li>
        </ul>
      </div>
    </div>
  );
}
