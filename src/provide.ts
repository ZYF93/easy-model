import { observe, safeGet } from "./observe";

const InstanceSymbol = Symbol("instance");
const instances = new Map();
const instanceArgs = new WeakMap();
const providers = new WeakMap();
const provided = new WeakSet();

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

  const ret = new Proxy(ctor, {
    apply(target, _, args) {
      if (!instances.has(ctor)) {
        instances.set(ctor, new Map());
      }

      let map = instances.get(ctor);

      for (let i = 0; i < args.length; i++) {
        if (!map.has(args[i])) {
          map.set(args[i], new Map());
        }
        map = map.get(args[i]);
      }

      if (!map.has(InstanceSymbol)) {
        map.set(InstanceSymbol, undefined);
        const instance = observe(Reflect.construct(target, args, FakeCtor));
        map.set(InstanceSymbol, instance);
        instanceArgs.set(instance, args);
      }

      return map.get(InstanceSymbol);
    },
  });

  providers.set(ctor, ret);
  provided.add(ret);

  return providers.get(ctor);

  function FakeCtor() {}
}

export function revoke(model: object) {
  const target = observe(model);
  if (!instanceArgs.has(target)) return;
  const args = instanceArgs.get(target);
  let map = instances.get(target.constructor);
  while (args.length) {
    map = map.get(args.shift());
  }
  map.delete(InstanceSymbol);
  instanceArgs.delete(target);
}
