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
  const [, forceUpdate] = useReducer(x => (x + 1) % 100, 0);
  useEffect(() => {
    const unWatch = watch(model, () => {
      forceUpdate();
    });
    return unWatch;
  }, [model]);
  return model;
}
