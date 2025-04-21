# easy-model

一个简单的react状态管理库

## 示例

```tsx
import { useModel } from "@e7w/easy-model";

class MTest {
  constructor(public name: string) {}

  value = 0;

  random() {
    this.value = Math.random();
  }
}

function TestComA() {
  const { value, random } = useModel(MTest, ["test"]);
  return (
    <div>
      <span>{value}</span>
      <button onClick={random}>changeValue</button>
    </div>
  );
}

function TestComB() {
  const { value } = useModel(MTest, ["test"]);
  return <span>{value}</span>;
}

render(
  <div>
    <TestComA />
    <TestComB />
  </div>
);
// 当点击ComA的div时，两个组件都会更新
```
