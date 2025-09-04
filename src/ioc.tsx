import {
  createContext,
  FC,
  PropsWithChildren,
  ReactNode,
  useContext,
} from "react";
import { ZodType } from "zod";
import { provide } from "./provide";

const ctorContainers: Record<string, Map<ZodType, new () => unknown>> = {};
const valContainers: Record<string, Map<ZodType, unknown>> = {};

const ctx = createContext({ namespace: "" });

export const Container: FC<PropsWithChildren<{ namespace?: string }>> = ({
  children,
  namespace = "",
}) => {
  return <ctx.Provider value={{ namespace }}>{children}</ctx.Provider>;
};

// 绑定构造函数到容器
export function CInjection<
  T extends ZodType,
  P extends new () => ReturnType<T["parse"]>,
>({ schema, ctor }: { schema: T; ctor: P }) {
  const { namespace } = useContext(ctx);
  if (!ctorContainers[namespace]) ctorContainers[namespace] = new Map();
  ctorContainers[namespace].set(schema, ctor);
  return null as ReactNode;
}

// 绑定值到容器
export function VInjection<T extends ZodType>({
  schema,
  val,
}: {
  schema: T;
  val: ReturnType<T["parse"]>;
}) {
  const { namespace } = useContext(ctx);
  if (!valContainers[namespace]) valContainers[namespace] = new Map();
  valContainers[namespace].set(schema, val);
  return null as ReactNode;
}

// 类的属性的装饰器，从容器里获取实例化的实例或值
export function inject<T extends ZodType>(schema: T, namespace = "") {
  return (
    _: unknown,
    { static: isStatic, kind }: ClassFieldDecoratorContext
  ) => {
    if (kind !== "field") throw "不能装饰非属性";
    if (isStatic) throw "不能装饰静态属性";
    return function <P extends ReturnType<T["parse"]> | undefined>(initVal: P) {
      let val = initVal;
      const ctor = ctorContainers[namespace].get(schema);
      if (ctor) val = provide(ctor as new () => typeof val)();
      else {
        val = (valContainers[namespace].get(schema) as typeof val) ?? val;
      }
      const { success, error } = schema.safeParse(val);
      if (success) return val;
      console.error("====注入属性失败====", error);
      return initVal;
    };
  };
}
