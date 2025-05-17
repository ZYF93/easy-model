import { finalizationRegistry, provide } from "@/provide";

const { promise, resolve } = Promise.withResolvers();
document.addEventListener("DOMContentLoaded", resolve);
await promise;

class MFoo {
  bar = 1;
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
