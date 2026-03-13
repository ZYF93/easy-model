// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Symbol.metadata ??= Symbol.for("metadata");

interface Field {
  type: "input" | "textarea";
  width: string;
}

interface Select {
  type: "select";
  width: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOptions(): any[] | Promise<any[]>;
}

interface Checkbox {
  type: "checkbox";
  width: string;
}

interface Radio {
  type: "radio";
  width: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOptions(): any[] | Promise<any[]>;
}

type FieldConfig = Field | Select | Checkbox | Radio;

type FormProp = Record<
  string | symbol,
  {
    prop: string;
    validate(value: unknown): { valid: boolean; message?: string };
    required: boolean;
    readonly: boolean;
    permission: number;
    defaultValue?: unknown;
    dependsOn(...args: any[]): boolean;
    fieldConfig: FieldConfig;
    placeholder?: string;
  }
>;

const symbol = Symbol();

function createUtils(
  options: Omit<FormProp[""], "defaultValue"> = {
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
  }
) {
  function dec(
    defaultValue: unknown,
    { name, metadata, static: isStatic, kind }: ClassFieldDecoratorContext
  ) {
    if (kind !== "field") {
      throw new Error("[form] - formUtils 相关装饰器只能用于类的属性字段");
    }
    if (isStatic) {
      throw new Error("[form] - formUtils 相关装饰器不能用于静态属性");
    }
    metadata[symbol] ??= {};
    return function <T>(initialValue: T) {
      (metadata[symbol] as FormProp)[name] = {
        ...options,
        defaultValue: structuredClone(defaultValue),
      };
      return initialValue;
    };
  }

  return Object.assign(dec, {
    prop(name: string) {
      return createUtils({ ...options, prop: name });
    },
    validate(validator: FormProp[""]["validate"]) {
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
    dependsOn(fn: FormProp[""]["dependsOn"]) {
      return createUtils({
        ...options,
        dependsOn: (...args) => options.dependsOn(...args) && fn(...args),
      });
    },
    config(fieldConfig: FormProp[""]["fieldConfig"]) {
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
  const props = ctor[Symbol.metadata]![symbol] as FormProp;
  return Object.keys(props || {}).map(name => ({
    name,
    ...props[name],
  }));
}
