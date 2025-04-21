type WatchCallback = (
  path: Array<string | symbol>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any
) => void;
const observedMap = new WeakMap<object, object>();
const watchers = new WeakMap<object, Map<symbol, WatchCallback>>();
const originSymbol = Symbol("origin");
let triggerIngTargets: WeakSet<object> | null = null;
const findMethods = ["includes", "indexOf", "lastIndexOf"];
const unsafeCtors = [Promise, WeakMap, WeakSet, Map, Set];

export function observe<T extends object>(target: T): T {
  target = getOrigin(target);
  if (!target || unsafeCtors.some(c => target instanceof c)) return target;
  if (observedMap.has(target)) return observedMap.get(target) as T;

  const cachedUnWatch: Record<string | symbol, ReturnType<typeof watch>> = {};
  const cachedFns: Record<string | symbol, (...args: any[]) => unknown> = {};

  const result = new Proxy(target, {
    get(t, p, r) {
      if (p === originSymbol) return t;
      let ret: unknown = safeGet(t, p);
      if (ret) return ret;
      ret = Reflect.get(t, p, r);
      if (typeof ret === "function") {
        if (!cachedFns[p]) {
          cachedFns[p] = ret.bind(observe(t));
        }
        ret = cachedFns[p];
      } else if (typeof ret === "object" && ret !== null) {
        if (!cachedUnWatch[p]) {
          cachedUnWatch[p] = watch(ret as object, createWatcher(target, p));
        }
        ret = observe(ret);
      }
      return ret;
    },
    set(t, p, nv, r) {
      let ov = Reflect.get(t, p, r);
      ov = getOrigin(ov);
      nv = getOrigin(nv);
      if (ov === nv) return true;
      const ret = Reflect.set(t, p, nv, r);
      if (ret) {
        if (cachedUnWatch[p]) {
          cachedUnWatch[p]();
          delete cachedUnWatch[p];
        }
        if (typeof nv === "object" && nv !== null) {
          cachedUnWatch[p] = watch(nv, createWatcher(target, p));
        }
        if (cachedFns[p]) {
          delete cachedFns[p];
        }
        const lastTriggerIngTargets = triggerIngTargets;
        triggerIngTargets = new WeakSet();
        trigger(t, [p], ov, nv);
        triggerIngTargets = lastTriggerIngTargets;
      }
      return ret;
    },
    deleteProperty(t, p) {
      let ov = Reflect.get(t, p);
      ov = getOrigin(ov);
      const ret = Reflect.deleteProperty(t, p);
      if (ret) {
        if (cachedUnWatch[p]) {
          cachedUnWatch[p]();
          delete cachedUnWatch[p];
        }
        if (cachedFns[p]) {
          delete cachedFns[p];
        }
        trigger(t, [p], ov, undefined);
      }
      return ret;
    },
  });
  observedMap.set(target, result);
  return result;
}

export function watch(target: object, callback: WatchCallback) {
  target = getOrigin(target);
  if (!watchers.has(target)) {
    watchers.set(target, new Map());
  }
  const callbackMap = watchers.get(target)!;
  const sign = Symbol();
  callbackMap.set(sign, callback);
  return function unwatch() {
    callbackMap.delete(sign);
  };
}

function createWatcher(target: object, key: string | symbol): WatchCallback {
  return function (...params) {
    const [path, ...rest] = params;
    trigger(target, [key, ...path], ...rest);
  };
}

function trigger(target: object, ...params: Parameters<WatchCallback>) {
  target = getOrigin(target);
  if (triggerIngTargets?.has(target)) return;
  triggerIngTargets?.add(target);
  const callbackMap = watchers.get(target);
  if (!callbackMap) return;
  const fns = [...callbackMap.values()];
  fns.forEach(fn => {
    const eventTarget = new EventTarget();
    const event = new Event("__trigger__");
    eventTarget.addEventListener(event.type, callback);
    eventTarget.dispatchEvent(event);
    function callback() {
      eventTarget.removeEventListener(event.type, callback);
      fn(...params);
    }
  });
}

function getOrigin<T>(target: T): T {
  if (typeof target !== "object" || target === null) return target;
  return (
    (target as Record<typeof originSymbol, T | undefined>)[originSymbol] ??
    target
  );
}

export function safeGet(target: object, p: string | symbol) {
  target = getOrigin(target);
  if (["constructor", "__proto__"].includes(p as string)) {
    return Reflect.get(target, p);
  }
  if (p === "hasOwnProperty") {
    return function (this: object, key: string) {
      return Object.prototype.hasOwnProperty.call(getOrigin(this), key);
    };
  }
  if (Array.isArray(target) && findMethods.includes(p as string)) {
    return function (this: object, ...args: any[]) {
      const ret = (
        findMethods[p as keyof typeof findMethods] as (
          ...args: any[]
        ) => unknown
      ).apply(getOrigin(this), args);
      if (ret === -1 || ret === false) {
        return (
          findMethods[p as keyof typeof findMethods] as (
            ...args: any[]
          ) => unknown
        ).apply(getOrigin(this), args.map(getOrigin));
      }
      return ret;
    };
  }

  return;
}
