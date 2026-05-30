const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000
): Promise<T> => {
  for (let i = 0; i < attempts; i++) {
    await delay(delayMs);
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
    }
  }
  throw new Error('unreachable');
};

export const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`/api${url}`, options);
  if (!res.ok) {
    let message = `${String(res.status)} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      /* non-JSON error body, keep status text */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
};

export const voidRequest = async (url: string, options?: RequestInit): Promise<void> => {
  const res = await fetch(`/api${url}`, options);
  if (!res.ok) {
    let message = `${String(res.status)} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      /* non-JSON error body, keep status text */
    }
    throw new Error(message);
  }
};
