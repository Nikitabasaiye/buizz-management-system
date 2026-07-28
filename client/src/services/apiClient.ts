export type ApiResult<T> = Promise<T>;

export function resolvedApi<T>(value: T): ApiResult<T> {
  return Promise.resolve(value);
}

export function createApiError(message: string) {
  return new Error(message);
}
