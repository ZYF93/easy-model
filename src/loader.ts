import { provide } from "./provide";

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
  loading: Record<symbol, [Fn, Promise<unknown>]> = {};
  globalLoading: number = 0;
  onceTokens: WeakMap<AsyncFn, symbol> = new WeakMap();
  oncePool: Record<symbol, Promise<unknown>> = {};

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
      const { loading, addGlobalLoading, subGlobalLoading } = this;
      return async function (
        this: Record<string | symbol, unknown>,
        ...args: Parameters<T>
      ) {
        const fn = Reflect.get(this, name) as T;
        const token = Token(fn, ...args);
        const isLoading = Boolean(loading[token.symbol]);
        if (isLoading) return loading[token.symbol][1];
        const { promise, resolve, reject } = Promise.withResolvers();
        loading[token.symbol] = [fn, promise];
        if (isGlobal) addGlobalLoading();
        try {
          const ret = await target.apply(this, args);
          resolve(ret);
        } catch (e) {
          reject(e);
        }
        Reflect.deleteProperty(loading, token.symbol);
        if (isGlobal) subGlobalLoading();
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
    return Object.getOwnPropertySymbols(this.loading).some(
      key => this.loading[key][0] === target
    );
  }

  get isGlobalLoading() {
    return this.globalLoading > 0;
  }
}

export const loader = provide(MLoader)();
