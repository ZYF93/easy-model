import {
  createContext,
  FC,
  PropsWithChildren,
  ReactNode,
  useContext,
} from "react";
import { ZodType } from "zod";
import { provide } from "./provide";

/**
 * 构造函数容器，按命名空间存储 schema 到构造函数的映射
 */
const ctorContainers: Record<string, Map<ZodType, new () => unknown>> = {};

/**
 * 值容器，按命名空间存储 schema 到值的映射
 */
const valContainers: Record<string, Map<ZodType, unknown>> = {};

/**
 * IoC 容器的 React Context
 */
const IoCContext = createContext<{ namespace: string }>({ namespace: "" });

/**
 * 获取或创建指定命名空间的构造函数容器
 */
function getOrCreateCtorContainer(
  namespace: string
): Map<ZodType, new () => unknown> {
  if (!ctorContainers[namespace]) {
    ctorContainers[namespace] = new Map();
  }
  return ctorContainers[namespace];
}

/**
 * 获取或创建指定命名空间的值容器
 */
function getOrCreateValContainer(namespace: string): Map<ZodType, unknown> {
  if (!valContainers[namespace]) {
    valContainers[namespace] = new Map();
  }
  return valContainers[namespace];
}

/**
 * IoC 容器组件，提供依赖注入的上下文环境
 *
 * @param namespace - 命名空间，用于隔离不同的依赖注入环境
 * @param children - 子组件
 */
export const Container: FC<PropsWithChildren<{ namespace?: string }>> = ({
  children,
  namespace = "",
}) => {
  return (
    <IoCContext.Provider value={{ namespace }}>{children}</IoCContext.Provider>
  );
};

/**
 * 构造函数注入组件，将构造函数注入到容器中
 *
 * @param schema - Zod schema，用于类型验证和作为依赖标识
 * @param ctor - 要注入的构造函数
 */
export function CInjection<
  T extends ZodType,
  P extends new () => ReturnType<T["parse"]>,
>({ schema, ctor }: { schema: T; ctor: P }): ReactNode {
  const { namespace } = useContext(IoCContext);
  const container = getOrCreateCtorContainer(namespace);
  container.set(schema, ctor);
  return null;
}

/**
 * 值注入组件，将值注入到容器中
 *
 * @param schema - Zod schema，用于类型验证和作为依赖标识
 * @param val - 要注入的值
 */
export function VInjection<T extends ZodType>({
  schema,
  val,
}: {
  schema: T;
  val: ReturnType<T["parse"]>;
}): ReactNode {
  const { namespace } = useContext(IoCContext);
  const container = getOrCreateValContainer(namespace);
  container.set(schema, val);
  return null;
}

/**
 * 依赖注入装饰器，从容器中获取实例或值
 *
 * @param schema - Zod schema，用于类型验证和作为依赖标识
 * @param namespace - 命名空间，默认为空字符串
 * @returns 装饰器函数
 */
export function inject<T extends ZodType>(schema: T, namespace = "") {
  return (
    _: unknown,
    { static: isStatic, kind }: ClassFieldDecoratorContext
  ) => {
    if (kind !== "field") {
      throw new Error("inject 装饰器只能用于类的属性字段");
    }
    if (isStatic) {
      throw new Error("inject 装饰器不能用于静态属性");
    }

    return function <P extends ReturnType<T["parse"]> | undefined>(
      initVal: P
    ): P {
      if (!isRegistered(schema, namespace)) {
        console.error(
          `[IoC] 依赖注入失败 - namespace: "${namespace}", schema: ${schema.description || "unknown"}`,
          "未注册"
        );
        return initVal;
      }

      let val = initVal;

      // 尝试从构造函数容器获取
      const ctor = ctorContainers[namespace]?.get(schema);
      if (ctor) {
        val = provide(ctor as new () => typeof val)() as P;
      } else {
        const valContainer = valContainers[namespace];
        if (valContainer?.has(schema)) {
          val = valContainer.get(schema) as P;
        }
      }

      // 验证注入的值
      const parseResult = schema.safeParse(val);
      if (parseResult.success) return val;

      // 验证失败，记录错误并返回初始值
      console.error(
        `[IoC] 依赖注入失败 - namespace: "${namespace}", schema: ${schema.description || "unknown"}`,
        parseResult.error.issues
      );
      return initVal;
    };
  };
}

/**
 * 清理指定命名空间的所有依赖
 *
 * @param namespace - 要清理的命名空间
 */
export function clearNamespace(namespace: string): void {
  delete ctorContainers[namespace];
  delete valContainers[namespace];
}

/**
 * 检查指定的 schema 是否已在命名空间中注册
 *
 * @param schema - 要检查的 schema
 * @param namespace - 命名空间
 * @returns 是否已注册
 */
export function isRegistered<T extends ZodType>(
  schema: T,
  namespace = ""
): boolean {
  const ctorContainer = ctorContainers[namespace];
  const valContainer = valContainers[namespace];

  return ctorContainer?.has(schema) || valContainer?.has(schema);
}
