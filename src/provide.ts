import { observe, safeGet } from "./observe";

const InstanceSymbol = Symbol("instance");
const providers = new WeakMap();
const provided = new WeakSet();
const tokens = new WeakMap();
const finalizationCallbacks = new WeakMap();

export function provide<T extends new (...args: any[]) => InstanceType<T>>(
  ctor: T
): T & ((...args: ConstructorParameters<T>) => InstanceType<T>) {
  if (provided.has(ctor)) {
    return ctor as T & ((...args: ConstructorParameters<T>) => InstanceType<T>);
  }
  if (providers.has(ctor)) {
    return providers.get(ctor);
  }

  const fakeFns: {
    [key in string | symbol]: (...args: any[]) => unknown;
  } = {};

  FakeCtor.prototype = new Proxy(
    {
      constructor: ctor,
      __proto__: ctor.prototype,
    },
    {
      get(target, p, receiver) {
        let ret: unknown = safeGet(target, p);
        if (ret) return ret;

        ret = Reflect.get(target, p, receiver);

        if (
          typeof p === "symbol" ||
          ["constructor", "__proto__"].includes(p) ||
          typeof ret !== "function"
        ) {
          return ret;
        }

        if (!fakeFns[p]) {
          fakeFns[p] = function (this: object, ...args: any[]) {
            return ret.apply(observe(this), args);
          };
        }

        return fakeFns[p];
      },
    }
  );

  const instances = new Map();

  const register = new FinalizationRegistry(
    ({ args, token }: { args: unknown[]; token: object }) => {
      revoke(instances, args);
      finalizationCallbacks.get(token)?.();
      register.unregister(token);
    }
  );

  const ret = new Proxy(ctor, {
    apply(target, _, args) {
      let map = instances;

      for (let i = 0; i < args.length; i++) {
        if (!map.has(args[i])) {
          map.set(args[i], new Map());
        }
        map = map.get(args[i]);
      }

      if (
        !map.has(InstanceSymbol) ||
        (map.get(InstanceSymbol) !== undefined &&
          !map.get(InstanceSymbol)?.deref?.())
      ) {
        map.set(InstanceSymbol, undefined);
        const instance = observe(Reflect.construct(target, args, FakeCtor));
        map.set(InstanceSymbol, new WeakRef(instance));
        const token = getToken(instance);
        register.register(instance, { args, token }, token);
      }

      return map.get(InstanceSymbol)?.deref?.();
    },
  });

  providers.set(ctor, ret);
  provided.add(ret);

  return providers.get(ctor);

  function FakeCtor() {}
}

function revoke(map: Map<unknown, unknown>, args: unknown[]) {
  if (args.length === 0) return map.delete(InstanceSymbol);
  const [key, ...rest] = args;
  const nextMap = map.get(key);
  if (nextMap instanceof Map) {
    revoke(nextMap, rest);
    if (nextMap.size > 0) return;
  }
  return map.delete(key);
}

export function finalizationRegistry(model: object) {
  const target = observe(model);
  const token = getToken(target);
  return {
    register(callback: () => void) {
      if (!token) return;
      finalizationCallbacks.set(token, callback);
    },
    unregister() {
      if (!token) return;
      finalizationCallbacks.delete(token);
    },
  };
}

function getToken(model: object) {
  if (!tokens.has(model)) {
    tokens.set(model, {});
  }
  return tokens.get(model);
}
