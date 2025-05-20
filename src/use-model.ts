import { useEffect, useReducer } from "react";
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
  const [, forceUpdate] = useReducer(x => (x + 1) % 100, 0);
  useEffect(() => {
    forceUpdate();
    return watch(model, () => forceUpdate());
  }, [model]);
  return model;
}
