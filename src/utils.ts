export const withResolvers = Promise.withResolvers
  ? <T>() => Promise.withResolvers<T>()
  : <T>() => {
      let resolve, reject;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve: resolve!, reject: reject! };
    };
