import { CInjection, config, Container, inject, VInjection } from "@/ioc";
import { offWatch, watch } from "@/observe";
import { finalizationRegistry, provide } from "@/provide";
import { infer as Infer, number, object } from "zod";

const { promise, resolve } = Promise.withResolvers();
document.addEventListener("DOMContentLoaded", resolve);
await promise;

console.log("依赖注入示例");

const schema = object({
  number: number(),
}).describe("测试用schema");
const schema2 = object({
  xxx: number(),
}).describe("Test类的schema");

class Test {
  constructor(public xxx: number) {}
}
class MFoo {
  @inject(schema)
  bar?: Infer<typeof schema>;
  @offWatch
  baz?: number;
  @inject(schema2)
  qux?: Infer<typeof schema2>;
}

config(
  <>
    <Container>
      <CInjection schema={schema2} ctor={Test} params={[1]} />
      <VInjection
        schema={schema}
        val={{
          number: 100,
        }}
      />
    </Container>
  </>
);

const Foo = provide(MFoo);
let foo: MFoo | undefined = Foo();

watch(foo, path => {
  console.log("如果offWatch没生效，会看到baz", path);
});

foo.baz = 20;
console.group("==第一次==");
console.log(JSON.stringify(foo.bar));
console.log(String(foo.baz));
console.log(JSON.stringify(foo.qux));
console.groupEnd();

foo = Foo();
console.group("==第二次==");
console.log(JSON.stringify(foo.bar));
console.log(String(foo.baz));
console.log(JSON.stringify(foo.qux));
console.groupEnd();
finalizationRegistry(foo).register(() => {
  console.log("foo 被回收了");
});
foo = undefined;
