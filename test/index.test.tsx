import { describe, expect, it, vi } from "vitest";
import {
  provide,
  useInstance,
  useModel,
  watch,
  config,
  Container,
  CInjection,
  VInjection,
  inject,
  isRegistered,
  // added for extra tests
  useWatcher,
  loader,
  useLoader,
  clearNamespace,
  offWatch,
  forUtils,
  useModelHistory,
  collect,
} from "../src";
import { object, number } from "zod";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

describe("provide and IOC extras", () => {
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

  it("config 能够执行函数组件并注册注入", () => {
    const schemaA = object({ a: number() }).describe("schemaA");
    class A {
      a = 1;
    }

    // 通过 config 传入 Container 将组件树执行一次
    config(
      <Container>
        <CInjection schema={schemaA} ctor={A} />
        <VInjection schema={schemaA} val={{ a: 42 }} />
      </Container>
    );

    // 无论是构造函数还是值均应当被注册
    expect(isRegistered(schemaA)).toBe(true);

    // 验证 inject 装饰器能够正常工作
    class B {
      @inject(schemaA)
      foo?: { a: number };
    }
    const b = provide(B)();
    // 由于 value 注入优先，期待通过 val 获取值
    expect(b.foo).toEqual({ a: 42 });
  });

  it("config 支持嵌套 Container 并正确隔离命名空间", () => {
    const schemaA = object({ a: number() }).describe("schemaA");
    const schemaB = object({ b: number() }).describe("schemaB");
    class A {
      a = 1;
    }

    config(
      <>
        <Container namespace="ns1">
          <CInjection schema={schemaA} ctor={A} />
        </Container>
        <Container namespace="ns2">
          <VInjection schema={schemaB} val={{ b: 7 }} />
        </Container>
      </>
    );

    expect(isRegistered(schemaA, "ns1")).toBe(true);
    expect(isRegistered(schemaA, "ns2")).toBe(false);
    expect(isRegistered(schemaB, "ns2")).toBe(true);
    expect(isRegistered(schemaB, "ns1")).toBe(false);

    class C {
      @inject(schemaB, "ns2")
      inner?: { b: number };
    }
    const c = provide(C)();
    expect(c.inner).toEqual({ b: 7 });
  });

  it("clearNamespace 能清理命名空间中的注册项", () => {
    const schemaA = object({ a: number() }).describe("schemaClear");
    class A {
      a = 1;
    }

    config(
      <Container namespace="ns_clear">
        <CInjection schema={schemaA} ctor={A} />
      </Container>
    );

    expect(isRegistered(schemaA, "ns_clear")).toBe(true);
    clearNamespace("ns_clear");
    expect(isRegistered(schemaA, "ns_clear")).toBe(false);
  });

  it("offWatch 装饰器能跳过对特定字段的监听", () => {
    class OffWatchTest {
      constructor(public name: string) {}
      value = 0;
      @offWatch
      internalCounter = 0;

      increment() {
        this.value += 1;
        this.internalCounter += 1;
      }
    }
    const Test = provide(OffWatchTest);

    const test = Test("offwatch");
    const watcher = vi.fn();
    const handle = watch(test, watcher);

    test.increment();

    handle();
    expect(watcher).toHaveBeenCalledTimes(1);
    expect(watcher).toHaveBeenCalledWith(["value"], 0, 1);
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

describe("hooks", () => {
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

  it("useWatcher 能在函数组件中监听模型变化", async () => {
    class MTest {
      constructor(public name: string) {}
      value = 0;
    }
    const Test = provide(MTest);
    const test = Test("uw");

    const spy = vi.fn();

    function Comp() {
      useWatcher(test, spy);
      const { value } = useInstance(test);
      return <span data-testid="uw">{value}</span>;
    }

    render(<Comp />);
    expect(screen.getByTestId("uw")).toHaveTextContent(/^0$/);
    test.value = 7;
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("loader 和 useLoader 能反映全局加载状态", async () => {
    class M {
      @loader.load(true)
      async fetch() {
        return new Promise<number>(resolve =>
          setTimeout(() => resolve(42), 20)
        );
      }
    }

    const Prov = provide(M);

    function Comp() {
      const { isGlobalLoading } = useLoader();
      const inst = useInstance(Prov("a"));
      return <span data-testid="gl">{String(isGlobalLoading)}</span>;
    }

    render(<Comp />);
    const inst = Prov("a");
    const p = inst.fetch();

    await waitFor(() =>
      expect(screen.getByTestId("gl").textContent).toBe("true")
    );
    await p;
    await waitFor(() =>
      expect(screen.getByTestId("gl").textContent).toBe("false")
    );
  });

  it("loader 的 isLoading 能反映单个方法的加载状态", async () => {
    class M {
      constructor(public name: string) {}
      @loader.load(true)
      async fetch() {
        return new Promise<number>(resolve =>
          setTimeout(() => resolve(42), 20)
        );
      }
    }

    const Prov = provide(M);

    function Comp() {
      const { isLoading } = useLoader();
      const inst = useInstance(Prov("b"));
      return <span data-testid="loading">{String(isLoading(inst.fetch))}</span>;
    }

    render(<Comp />);
    const inst = Prov("b");
    const p = inst.fetch();

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("true")
    );
    await p;
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
  });
});

describe("form-utils", () => {
  it("should create form props with decorators", () => {
    class FormModel {
      @(forUtils.prop("name").required())
      name = "";

      @(forUtils
        .prop("age")
        .validate(v =>
          typeof v === "number"
            ? { valid: true }
            : { valid: false, message: "must be number" }
        ))
      age = 0;

      @(forUtils.prop("email").readonly())
      email = "";

      @(forUtils.prop("role").permission(1))
      role = "user";

      @(forUtils.prop("description").placeholder("Enter description"))
      description = "";
    }

    const props = forUtils.getProps(FormModel);

    expect(props).toHaveLength(5);

    const nameProp = props.find(p => p.name === "name");
    expect(nameProp).toBeDefined();
    expect(nameProp!.prop).toBe("name");
    expect(nameProp!.required).toBe(true);
    expect(nameProp!.readonly).toBe(false);

    const ageProp = props.find(p => p.name === "age");
    expect(ageProp).toBeDefined();
    expect(ageProp!.validate(25)).toEqual({ valid: true });
    expect(ageProp!.validate("25")).toEqual({
      valid: false,
      message: "must be number",
    });

    const emailProp = props.find(p => p.name === "email");
    expect(emailProp!.readonly).toBe(true);

    const roleProp = props.find(p => p.name === "role");
    expect(roleProp!.permission).toBe(1);

    const descProp = props.find(p => p.name === "description");
    expect(descProp!.placeholder).toBe("Enter description");
  });

  it("should support dependsOn decorator", () => {
    class FormModel {
      @(forUtils.prop("isAdmin").required())
      isAdmin = false;

      @(forUtils.prop("adminCode").dependsOn(function (this: FormModel) {
        return this.isAdmin;
      }))
      adminCode = "";
    }

    const props = forUtils.getProps(FormModel);
    const adminCodeProp = props.find(p => p.name === "adminCode");
    expect(adminCodeProp!.dependsOn.call({ isAdmin: true })).toBe(true);
    expect(adminCodeProp!.dependsOn.call({ isAdmin: false })).toBe(false);
  });

  it("should support config decorator for field types", () => {
    class FormModel {
      @(forUtils.prop("username").config({ type: "input", width: "50%" }))
      username = "";

      @(forUtils.prop("gender").config({
        type: "select",
        width: "100%",
        getOptions: () => ["male", "female"],
      }))
      gender = "";
    }

    const props = forUtils.getProps(FormModel);
    const usernameProp = props.find(p => p.name === "username");
    expect(usernameProp!.fieldConfig.type).toBe("input");
    expect(usernameProp!.fieldConfig.width).toBe("50%");

    const genderProp = props.find(p => p.name === "gender");
    expect(genderProp!.fieldConfig.type).toBe("select");
    expect(genderProp!.fieldConfig.getOptions?.()).toEqual(["male", "female"]);
  });
});

describe("history", () => {
  it("should track changes and allow undo/redo", () => {
    class TestModel {
      value = 0;
      name = "test";
    }

    const Test = provide(TestModel);
    const model = Test();
    const history = collect(model);

    expect(history.hasPrev).toBe(false);
    expect(history.hasNext).toBe(false);

    model.value = 1;
    expect(history.hasPrev).toBe(true);
    expect(history.hasNext).toBe(false);

    model.name = "changed";
    expect(history.hasPrev).toBe(true);

    history.back();
    expect(model.name).toBe("test");
    expect(history.hasPrev).toBe(true);
    expect(history.hasNext).toBe(true);

    history.back();
    expect(model.value).toBe(0);
    expect(history.hasPrev).toBe(false);
    expect(history.hasNext).toBe(true);

    history.forward();
    expect(model.value).toBe(1);
    expect(history.hasNext).toBe(true);

    history.forward();
    expect(model.name).toBe("changed");
    expect(history.hasNext).toBe(false);
  });

  it("should reset to initial state", () => {
    class TestModel {
      value = 0;
    }

    const Test = provide(TestModel);
    const model = Test();
    const history = collect(model);

    model.value = 1;
    model.value = 2;
    model.value = 3;

    expect(model.value).toBe(3);
    expect(history.hasPrev).toBe(true);

    history.reset();
    expect(model.value).toBe(0);
    expect(history.hasPrev).toBe(false);
  });

  it("should handle nested object changes", () => {
    class TestModel {
      obj = { a: 1, b: 2 };
    }

    const Test = provide(TestModel);
    const model = Test();
    const history = collect(model);

    model.obj.a = 10;
    expect(history.hasPrev).toBe(true);

    history.back();
    expect(model.obj.a).toBe(1);
  });

  it("useModelHistory should work with useModel", () => {
    class TestModel {
      value = 0;
    }

    let model: any;
    let history: any;
    function TestComp() {
      model = useModel(TestModel, []);
      history = useModelHistory(model);
      return <div>test</div>;
    }

    render(<TestComp />);

    expect(history.hasPrev).toBe(false);

    model.value = 1;
    expect(history.hasPrev).toBe(true);

    history.back();
    expect(model.value).toBe(0);
  });
});
