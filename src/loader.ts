import { provide } from "./provide";
import { useInstance } from "./hooks";
import { withResolvers } from "./utils";

type Fn = (...args: any[]) => unknown;
type AsyncFn<T = unknown> = (...args: any[]) => Promise<T>;

class MToken {
  readonly symbol = Symbol();
  readonly args: unknown[];
  constructor(
    readonly target: Fn,
    ...args: unknown[]
  ) {
    this.args = args;
  }
}

const Token = provide(MToken);

class MLoader {
  loading: Record<symbol, Promise<unknown>> = {};
  globalLoading: number = 0;
  onceTokens: WeakMap<AsyncFn, symbol> = new WeakMap();
  oncePool: Record<symbol, Promise<unknown>> = {};
  loadingTokens: WeakMap<AsyncFn, symbol> = new WeakMap();

  addGlobalLoading() {
    this.globalLoading++;
  }

  subGlobalLoading() {
    this.globalLoading--;
  }

  load(isGlobal = false) {
    return <T extends AsyncFn>(
      target: T,
      { name }: ClassMethodDecoratorContext
    ) => {
      const { loading, addGlobalLoading, subGlobalLoading, loadingTokens } =
        this;
      return async function (
        this: Record<string | symbol, unknown>,
        ...args: Parameters<T>
      ) {
        const fn = Reflect.get(this, name) as T;
        const token = Token(fn, ...args);
        loadingTokens.set(fn, token.symbol);
        const isLoading = Boolean(loading[token.symbol]);
        if (isLoading) return loading[token.symbol];
        const { promise, resolve, reject } = withResolvers();
        loading[token.symbol] = promise;
        if (isGlobal) addGlobalLoading();
        try {
          const ret = await target.apply(this, args);
          resolve(ret);
        } catch (e) {
          reject(e);
        }
        Reflect.deleteProperty(loading, token.symbol);
        if (isGlobal) subGlobalLoading();
        loadingTokens.delete(fn);
        return promise;
      } as T;
    };
  }

  once<T extends AsyncFn>(target: T, { name }: ClassMethodDecoratorContext) {
    const { oncePool, onceTokens } = this;
    return function (
      this: Record<string | symbol, unknown>,
      ...args: Parameters<T>
    ) {
      const fn = Reflect.get(this, name) as T;
      if (!onceTokens.has(fn)) {
        onceTokens.set(fn, Symbol());
      }
      const token = onceTokens.get(fn)!;
      const exist = Boolean(oncePool[token]);
      if (!exist) {
        oncePool[token] = target.apply(this, args).catch(e => {
          Reflect.deleteProperty(oncePool, token);
          return Promise.reject(e);
        });
      }
      return oncePool[token];
    } as T;
  }

  isLoading<T extends AsyncFn>(target: T) {
    const token = this.loadingTokens.get(target);
    if (!token) return false;
    return Boolean(this.loading[token]);
  }

  get isGlobalLoading() {
    return this.globalLoading > 0;
  }
}

export const loader = provide(MLoader)();
export const useLoader = () => {
  const { isGlobalLoading, isLoading } = useInstance(loader);
  return { isGlobalLoading, isLoading };
};
