import { inject } from "@/ioc";
import { finalizationRegistry, provide } from "@/provide";
import { infer as Infer, number } from "zod";

const { promise, resolve } = Promise.withResolvers();
document.addEventListener("DOMContentLoaded", resolve);
await promise;

const schema = number();
class MFoo {
  @inject(schema)
  bar: Infer<typeof schema> = 1;
}

const Foo = provide(MFoo);
let foo: MFoo | undefined = Foo();
foo.bar = 2;
document.writeln(String(foo.bar));

foo = Foo();
document.writeln(String(foo.bar));
finalizationRegistry(foo).register(() => {
  console.log("foo 被回收了");
});
foo = undefined;
