import { describe, expect, it, vi } from "vitest";
import { provide, useInstance, useModel, watch } from "../src";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";

describe("provide", () => {
  it("同样的参数获取同一个实例", () => {
    class MTest {
      constructor(public name: string) {}

      value = 0;

      obj = {
        a: 1,
      };

      child?: MTest;
    }
    const Test = provide(MTest);

    expect(Test("test")).toBe(Test("test"));
  });

  it("不同参数获取不同实例", () => {
    class MTest {
      constructor(public name: string) {}

      value = 0;

      obj = {
        a: 1,
      };

      child?: MTest;
    }
    const Test = provide(MTest);

    expect(Test("test1")).not.toBe(Test("test2"));
  });

  it("属性变化时可以监听到", () => {
    class MTest {
      constructor(public name: string) {}

      value = 0;

      obj = {
        a: 1,
      };

      child?: MTest;
    }
    const Test = provide(MTest);

    const test = Test("test");
    watch(test, () => {
      expect(test.value).toBe(1);
    });
    test.value = 1;
  });

  it("可以观察到嵌套的属性变化", () => {
    class MTest {
      constructor(public name: string) {}

      value = 0;

      obj = {
        a: 1,
      };

      child?: MTest;
    }
    const Test = provide(MTest);

    const test = Test("test");
    const { obj } = test;
    watch(obj, () => {
      expect(obj.a).toBe(2);
    });
    obj.a = 2;
  });

  it("实例嵌套时可以观察到属性变化", () => {
    class MTest {
      constructor(public name: string) {}

      value = 0;

      obj = {
        a: 1,
      };

      child?: MTest;

      get child2() {
        return Test("test3");
      }
    }
    const Test = provide(MTest);

    const test = Test("test");
    const test2 = Test("test2");

    const watcher1 = vi.fn();
    const handle1 = watch(test, watcher1);
    test2.value = 1;
    handle1();
    expect(watcher1).not.toHaveBeenCalled();

    test.child = test2;
    const watcher2 = vi.fn();
    const handle2 = watch(test, watcher2);
    test2.value = 2;
    handle2();
    expect(watcher2).toHaveBeenCalledTimes(1);

    test2.child = test;
    const watcher3 = vi.fn();
    const handle3 = watch(test, watcher3);
    const watcher4 = vi.fn();
    const handle4 = watch(test2, watcher4);
    test.value = 3;
    handle3();
    handle4();
    expect(watcher3).toHaveBeenCalledTimes(1);
    expect(watcher4).toHaveBeenCalledTimes(1);

    const watcher5 = vi.fn();
    const handle5 = watch(test, watcher5);
    const watcher6 = vi.fn();
    const handle6 = watch(test2, watcher6);
    test2.value = 4;
    handle5();
    handle6();
    expect(watcher5).toHaveBeenCalledTimes(1);
    expect(watcher6).toHaveBeenCalledTimes(1);

    test.child = test;
    const watcher7 = vi.fn();
    const handle7 = watch(test, watcher7);
    test.value = 5;
    handle7();
    expect(watcher7).toHaveBeenCalledTimes(1);

    const watcher8 = vi.fn();
    const handle8 = watch(test, watcher8);
    console.log(test.child2);
    Test("test3").value = 6;
    handle8();
    expect(watcher8).toBeCalledWith(["child2", "value"], 0, 6);
  });

  // todo: node下gc不清除weakref，需要后面再研究
  // it("触发GC", async () => {
  //   const registry = new FinalizationRegistry(message => {
  //     events.add(message);
  //   });

  //   const events = new Set();

  //   function traceGC(obj, message) {
  //     registry.register(obj, message);
  //   }

  //   function awaitGC(message) {
  //     return new Promise(resolve => {
  //       global.gc!();

  //       const timer = setInterval(() => {
  //         if (events.has(message)) {
  //           events.delete(message);
  //           clearInterval(timer);
  //           resolve(null);
  //         }
  //       });
  //     });
  //   }

  //   let obj: object | null = {};
  //   const ref = new WeakRef(obj);
  //   console.log(ref.deref());
  //   traceGC(obj, "message");
  //   obj = null;

  //   await awaitGC("message");
  // });

  // it("正确取消缓存的实例", async () => {
  //   class MTest {
  //     constructor(public name: string) {}

  //     value = 0;

  //     obj = {
  //       a: 1,
  //     };

  //     child?: MTest;
  //   }
  //   const Test = provide(MTest);

  //   let test: MTest | undefined = Test("test");
  //   test.value = 100;
  //   expect(test.value).toBe(100);
  //   expect(Test("test").value).toBe(100);

  //   test = undefined;
  //   global.gc!();
  //   await new Promise(resolve => {
  //     setTimeout(() => {
  //       resolve(null);
  //     });
  //   });
  //   expect(Test("test").value).not.toBe(100);
  // });
});

describe("useModel", () => {
  it("两个组件中通讯", () => {
    class MTest {
      constructor(public name: string) {}

      value = 0;

      random() {
        this.value = Math.random();
      }
    }

    const Test = provide(MTest);

    function TestComA() {
      const { value, random } = useModel(MTest, ["test"]);
      return (
        <div>
          <span data-testid="comA">{value}</span>
          <button onClick={random}>changeValue</button>
        </div>
      );
    }

    function TestComB() {
      const { value } = useInstance(Test("test"));
      return <span data-testid="comB">{value}</span>;
    }

    render(
      <div>
        <TestComA />
        <TestComB />
      </div>
    );

    const spy = vi.spyOn(Math, "random").mockReturnValue(100);

    expect(screen.getByTestId("comA")).toHaveTextContent(/^0$/);
    expect(screen.getByTestId("comB")).toHaveTextContent(/^0$/);
    fireEvent.click(screen.getByText("changeValue"));
    expect(spy).toHaveBeenCalled();
    expect(screen.getByTestId("comA")).toHaveTextContent(/^100$/);
    expect(screen.getByTestId("comB")).toHaveTextContent(/^100$/);

    spy.mockRestore();
  });
});
