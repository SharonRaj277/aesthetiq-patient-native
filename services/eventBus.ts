type Callback = (data: any) => void;

const listeners: Record<string, Callback[]> = {};

export function subscribe(event: string, cb: Callback): () => void {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(cb);

  return () => {
    listeners[event] = listeners[event].filter((fn) => fn !== cb);
  };
}

export function emit(event: string, data: any): void {
  if (!listeners[event]) return;
  listeners[event].forEach((cb) => cb(data));
}
