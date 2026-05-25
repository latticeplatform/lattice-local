export const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`/api${url}`, options);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
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
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      /* non-JSON error body, keep status text */
    }
    throw new Error(message);
  }
};
