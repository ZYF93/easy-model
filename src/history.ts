import { offWatch, watch } from "./observe";
import { provide } from "./provide";

interface HistoryItem {
  prev?: HistoryItem;
  next?: HistoryItem;
  data: {
    path: (string | symbol)[];
    value?: unknown;
  }[];
}

export class History<T extends object> {
  @offWatch
  private model: T;

  constructor(model: T) {
    this.model = model;
    this.start();
  }

  private current: HistoryItem = { data: [] };
  private batching = false;

  get hasPrev() {
    return Boolean(this.current.prev);
  }

  get hasNext() {
    return Boolean(this.current.next);
  }

  stop?: () => void;

  private isSamePath(pathA: (string | symbol)[], pathB: (string | symbol)[]) {
    return (
      pathA.length === pathB.length && pathA.every((k, i) => pathB[i] === k)
    );
  }

  start() {
    this.stop?.();
    this.stop = watch(this.model, (path, value, newValue) => {
      if (this.batching) {
        const prevData = this.current.prev!.data;
        if (!prevData.some(obj => this.isSamePath(obj.path, path))) {
          prevData.push({ path, value });
        }
        const curIdx = this.current.data.findIndex(obj =>
          this.isSamePath(obj.path, path)
        );
        if (curIdx === -1) {
          this.current.data.push({ path, value: newValue });
        } else {
          this.current.data[curIdx].value = newValue;
        }
      } else {
        const prev = this.current;
        this.current = {
          prev,
          data: [{ path, value: newValue }],
        };
        prev.next = this.current;
        prev.data.push({ path, value });
      }
    });
  }

  private setValue(data: { path: (string | symbol)[]; value?: unknown }[]) {
    this.stop?.();
    const d = [...data];
    while (d.length) {
      const { path, value } = d.shift()!;
      const p = [...path];
      const lastKey = p.pop();
      let last: Record<string | symbol, unknown> = this.model as Record<
        string | symbol,
        unknown
      >;
      while (p.length) {
        last = last[p.shift()!] as typeof last;
      }
      if (lastKey) last[lastKey] = value;
    }
    this.start();
  }

  back() {
    if (!this.current.prev) return;
    const { prev } = this.current;
    this.current = prev;
    this.setValue(prev.data);
  }

  forward() {
    if (!this.current.next) return;
    const { next } = this.current;
    this.current = next;
    this.setValue(next.data);
  }

  reset() {
    const data = [];
    while (this.hasPrev) {
      data.push(this.current.prev!.data);
      this.current = this.current.prev!;
    }
    this.current = { data: [] };
    this.setValue(data.flat());
  }

  /**
   * 批量修改状态记录到同一条历史里
   */
  batch(fn: () => void) {
    this.batching = true;
    const prev = this.current;
    this.current = {
      prev,
      data: [],
    };
    prev.next = this.current;
    try {
      fn();
    } catch (error) {
      console.error(error);
    }
    if (!this.current.data.length) {
      this.current = prev;
      prev.next = undefined;
    }
    this.batching = false;
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.current = { data: [] };
  }
}

export const collect = provide(History);
