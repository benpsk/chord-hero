const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
let authToken: string | null = null;

type ErrorBag = Record<string, unknown>;

export class ApiError extends Error {
  status: number;
  errors?: ErrorBag;

  constructor(message: string, status: number, errors?: ErrorBag) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function extractMessage(errors?: ErrorBag) {
  if (!errors) return 'Request failed';
  if (typeof errors.message === 'string' && errors.message.trim()) {
    return errors.message;
  }

  const parts = Object.values(errors).filter((value) => typeof value === 'string') as string[];
  return parts.length ? parts.join(', ') : 'Request failed';
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { body, headers, ...rest } = options ?? {};
  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers ?? {}),
    },
    body:
      body === undefined
        ? undefined
        : typeof body === 'string'
        ? body
        : JSON.stringify(body),
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError('Invalid JSON response from server', response.status ?? 0);
  }

  if (!response.ok) {
    const errors = (payload?.errors ?? payload) as ErrorBag | undefined;
    throw new ApiError(extractMessage(errors), response.status, errors);
  }

  if (payload && typeof payload === 'object') {
    if ('errors' in payload && payload.errors) {
      const errors = payload.errors as ErrorBag;
      throw new ApiError(extractMessage(errors), response.status, errors);
    }
  }
  return payload as T;
}

export async function apiGet<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
  return request<T>(path, { ...options, method: options?.method ?? 'GET' });
}

export async function apiPost<TBody, TResponse>(path: string, body: TBody): Promise<TResponse> {
  return request<TResponse>(path, { method: 'POST', body });
}
