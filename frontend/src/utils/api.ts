const retryDelays = [2000, 5000];
const retryableHttpStatuses = new Set([500, 502, 503, 504]);

class ApiResponseError extends Error {
  readonly retryable: boolean;

  constructor(endpoint: string, status: number) {
    super(`Falha ao consultar ${endpoint}: HTTP ${status}.`);
    this.retryable = retryableHttpStatuses.has(status);
  }
}

function wait(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Requisição cancelada.', 'AbortError'));
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, delay);

    function handleAbort() {
      window.clearTimeout(timer);
      reject(new DOMException('Requisição cancelada.', 'AbortError'));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export async function fetchJsonWithRetry<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const response = await fetch(endpoint, { signal });
      if (!response.ok) {
        const error = new ApiResponseError(endpoint, response.status);
        if (!error.retryable || attempt === retryDelays.length) throw error;
        lastError = error;
      } else {
        return await response.json() as T;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (error instanceof ApiResponseError && !error.retryable) throw error;
      lastError = error;
      if (attempt === retryDelays.length) throw error;
    }

    await wait(retryDelays[attempt], signal);
  }

  throw lastError;
}
