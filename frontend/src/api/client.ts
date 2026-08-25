type ApiError = { code: string; message: string };

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5297/api";

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!response.ok) {
    throw (await response.json().catch(() => ({
      code: "UNEXPECTED_RESPONSE",
      message: "The server returned an unexpected response.",
    }))) as ApiError;
  }

  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
