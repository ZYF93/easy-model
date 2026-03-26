import React, { useEffect, useState } from "react";
import { formUtils } from "../src";

// 定义表单模型，使用装饰器配置字段
class UserFormModel {
  @(formUtils
    .prop("username")
    .required()
    .validate(value => {
      if (typeof value !== "string" || value.length < 3) {
        return { valid: false, message: "用户名至少3个字符" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" })
    .placeholder("请输入用户名"))
  username = "";

  @(formUtils
    .prop("email")
    .required()
    .validate(value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== "string" || !emailRegex.test(value)) {
        return { valid: false, message: "请输入有效的邮箱地址" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "100%" })
    .placeholder("请输入邮箱"))
  email = "";

  @(formUtils
    .prop("age")
    .validate(value => {
      if (typeof value !== "number" || value < 0 || value > 120) {
        return { valid: false, message: "年龄必须在0-120之间" };
      }
      return { valid: true };
    })
    .config({ type: "input", width: "50%" })
    .placeholder("请输入年龄"))
  age = 0;

  @(formUtils.prop("isAdmin").config({ type: "checkbox", width: "auto" }))
  isAdmin = false;

  @(formUtils
    .prop("adminCode")
    .dependsOn(function (this: UserFormModel) {
      return this.isAdmin;
    })
    .required()
    .config({ type: "input", width: "100%" })
    .placeholder("管理员代码"))
  adminCode = "";

  @(formUtils
    .prop("role")
    .permission(1)
    .config({
      type: "select",
      width: "100%",
      getOptions: () => ["user", "moderator", "admin"],
    }))
  role = "user";

  @(formUtils
    .prop("description")
    .readonly()
    .config({ type: "textarea", width: "100%" })
    .placeholder("描述"))
  description = "这是一个只读字段";
}

// 获取表单配置
const formProps = formUtils.getProps(UserFormModel);

// 简单的表单渲染组件（演示用）
function FormField({ prop }: { prop: formUtils.FormProp }) {
  const {
    name,
    prop: fieldName,
    required,
    readonly,
    fieldConfig,
    placeholder,
  } = prop;

  const [options, setOptions] = useState<string[]>([]);
  async function getOptions() {
    setOptions((await fieldConfig.getOptions?.()) || []);
  }
  useEffect(() => {
    getOptions();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    // 这里可以更新模型实例
    console.log(`${String(name)}:`, e.target.value);
  };

  const renderField = () => {
    switch (fieldConfig.type) {
      case "input":
        return (
          <input
            type="text"
            name={fieldName}
            placeholder={placeholder}
            readOnly={readonly}
            onChange={handleChange}
            style={{ width: fieldConfig.width }}
          />
        );
      case "textarea":
        return (
          <textarea
            name={fieldName}
            placeholder={placeholder}
            readOnly={readonly}
            onChange={handleChange}
            style={{ width: fieldConfig.width }}
          />
        );
      case "select":
        return (
          <select
            name={fieldName}
            onChange={handleChange}
            style={{ width: fieldConfig.width }}
          >
            {options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <input type="checkbox" name={fieldName} onChange={handleChange} />
        );
      default:
        return <div>Unsupported field type</div>;
    }
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        {fieldName} {required && <span style={{ color: "red" }}>*</span>}
      </label>
      {renderField()}
    </div>
  );
}

export default function FormExample() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2>表单工具示例</h2>
      <p>使用装饰器定义表单字段配置，通过 getProps 获取配置并渲染表单。</p>

      <form>
        {formProps.map(prop => (
          <FormField key={String(prop.name)} prop={prop} />
        ))}
      </form>

      <h3>表单配置详情</h3>
      <pre
        style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}
      >
        {JSON.stringify(formProps, null, 2)}
      </pre>
    </div>
  );
}
