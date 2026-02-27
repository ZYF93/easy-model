export const withResolvers =
  Promise.withResolvers ||
  (<T>() => {
    let resolve, reject;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  });
