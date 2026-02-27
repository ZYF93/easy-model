import { CInjection, config, Container, inject, VInjection } from "@/ioc";
import { finalizationRegistry, provide } from "@/provide";
import { infer as Infer, number, object } from "zod";

const { promise, resolve } = Promise.withResolvers();
document.addEventListener("DOMContentLoaded", resolve);
await promise;

document.writeln("依赖注入示例");

const schema = object({
  number: number(),
}).describe("测试用schema");
const schema2 = object({
  xxx: number(),
}).describe("Test类的schema");

class Test {
  xxx = 1;
}
class MFoo {
  @inject(schema)
  bar?: Infer<typeof schema>;
  baz?: number;
  @inject(schema2)
  qux?: Infer<typeof schema2>;
}

config(
  <>
    <Container>
      <CInjection schema={schema2} ctor={Test} />
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
foo.baz = 20;
document.writeln(JSON.stringify(foo.bar));
document.writeln(String(foo.baz));
document.writeln(JSON.stringify(foo.qux));

foo = Foo();
document.writeln(JSON.stringify(foo.bar));
document.writeln(String(foo.baz));
document.writeln(JSON.stringify(foo.qux));
finalizationRegistry(foo).register(() => {
  console.log("foo 被回收了");
});
foo = undefined;
