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

class History<T extends object> {
  @offWatch
  private model: T;

  constructor(model: T) {
    this.model = model;
    this.start();
  }

  private current: HistoryItem = { data: [] };

  get hasPrev() {
    return Boolean(this.current.prev);
  }

  get hasNext() {
    return Boolean(this.current.next);
  }

  stop?: () => void;

  private start() {
    this.stop?.();
    this.stop = watch(this.model, (path, value, newValue) => {
      const prev = this.current;
      this.current = {
        prev,
        data: [{ path, value: newValue }],
      };
      prev.next = this.current;
      prev.data.push({ path, value });
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
}

export const collect = provide(History);
