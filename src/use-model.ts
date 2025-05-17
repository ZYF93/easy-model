import { useEffect, useReducer, useRef } from "react";
import { watch } from "./observe";
import { provide } from "./provide";

const emptyObject = Object.create(null);
export function useModel<T extends new (...args: any[]) => InstanceType<T>>(
  Ctor: T,
  args: ConstructorParameters<T>
): InstanceType<T>;
export function useModel<T extends new (...args: any[]) => InstanceType<T>>(
  Ctor: T,
  args: ConstructorParameters<T> | null
): InstanceType<T> | Partial<InstanceType<T>>;
export function useModel<T extends new (...args: any[]) => InstanceType<T>>(
  Ctor: T,
  args: ConstructorParameters<T> | null
): InstanceType<T> | Partial<InstanceType<T>> {
  const Provider = provide(Ctor);
  const model = args ? Provider(...args) : emptyObject;
  return useInstance(model);
}

export function useInstance<T extends object>(model: T) {
  const ref = useRef<T>(null);
  if (ref.current !== model) ref.current = model;
  const [, forceUpdate] = useReducer(x => (x + 1) % 100, 0);
  useEffect(() => {
    const unWatch = watch(ref.current as object, () => {
      forceUpdate();
    });
    return unWatch;
  }, [ref.current]);
  return ref.current;
}
