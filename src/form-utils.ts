import { FC } from "react";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Symbol.metadata ??= Symbol.for("metadata");

export type FormProp = {
  prop: string;
  validate(value: unknown): { valid: boolean; message?: string };
  required: boolean;
  readonly: boolean;
  permission: number;
  dependsOn(...args: any[]): boolean;
  fieldConfig: {
    type:
      | FC<
          {
            value: unknown;
            onChange: (value: unknown) => void;
            options?: unknown[];
          } & Record<string, unknown>
        >
      | string;
    width: string;
  } & Record<string, unknown>;
  placeholder?: string;
  name: string | symbol;
};

export interface Dec {
  (_: unknown, ctx: ClassFieldDecoratorContext<unknown, unknown>): void;
  prop(name: string): Dec;
  validate(validator: FormProp["validate"]): Dec;
  required(isRequired?: boolean): Dec;
  readonly(isReadonly?: boolean): Dec;
  permission(code: number): Dec;
  dependsOn(fn: FormProp["dependsOn"]): Dec;
  config(fieldConfig: FormProp["fieldConfig"]): Dec;
  placeholder(text: string): Dec;
}

const symbol = Symbol();

function createUtils(
  options: FormProp = {
    prop: "",
    validate: () => ({ valid: true }),
    readonly: false,
    required: false,
    permission: 0,
    dependsOn: () => true,
    fieldConfig: {
      type: "input",
      width: "100%",
    },
    name: "",
  }
): Dec {
  function dec(
    _: unknown,
    { name, metadata, static: isStatic, kind }: ClassFieldDecoratorContext
  ) {
    if (kind !== "field") {
      throw new Error("[form] - formUtils 相关装饰器只能用于类的属性字段");
    }
    if (isStatic) {
      throw new Error("[form] - formUtils 相关装饰器不能用于静态属性");
    }
    metadata[symbol] ??= {};
    if ((metadata[symbol] as Record<string | symbol, FormProp>)[name]) {
      Object.assign(
        (metadata[symbol] as Record<string | symbol, FormProp>)[name],
        options
      );
    } else {
      (metadata[symbol] as Record<string | symbol, FormProp>)[name] = options;
    }
  }

  return Object.assign(dec, {
    prop(name: string) {
      return createUtils({ ...options, prop: name });
    },
    validate(validator: FormProp["validate"]) {
      return createUtils({
        ...options,
        validate(value) {
          const prev = options.validate(value);
          if (!prev.valid) return prev;
          return validator(value);
        },
      });
    },
    required(isRequired = true) {
      return createUtils({ ...options, required: isRequired });
    },
    readonly(isReadonly = true) {
      return createUtils({ ...options, readonly: isReadonly });
    },
    permission(code: number) {
      return createUtils({ ...options, permission: code });
    },
    dependsOn(fn: FormProp["dependsOn"]) {
      return createUtils({
        ...options,
        dependsOn(this, ...args) {
          return options.dependsOn.apply(this, args) && fn.apply(this, args);
        },
      });
    },
    config(fieldConfig: FormProp["fieldConfig"]) {
      return createUtils({
        ...options,
        fieldConfig,
      });
    },
    placeholder(text: string) {
      return createUtils({ ...options, placeholder: text });
    },
  });
}

export const {
  prop,
  readonly,
  required,
  validate,
  permission,
  dependsOn,
  config,
  placeholder,
} = createUtils();

export function getProps(ctor: new (...args: any[]) => unknown) {
  if (!ctor[Symbol.metadata]) return [];
  const props = ctor[Symbol.metadata]![symbol] as Record<
    string | symbol,
    FormProp
  >;
  return Object.keys(props).map(name => ({
    ...props[name],
    name,
  })) as FormProp[];
}
