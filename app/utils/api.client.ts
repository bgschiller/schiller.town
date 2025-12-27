// Client-side API utilities

/**
 * Gets the API host, normalizing 0.0.0.0 to localhost for client connections.
 * This is needed when the dev server binds to 0.0.0.0 but browsers need to use localhost.
 */
export function getApiHost(): string {
  let host = window.location.origin;
  if (host.includes("0.0.0.0")) {
    host = host.replace("0.0.0.0", "localhost");
  }
  return host;
}

/**
 * Builds a full API URL from a path.
 * @param path - The API path (e.g., "/api/documents")
 * @returns The full URL with normalized host
 */
export function getApiUrl(path: string): string {
  const host = getApiHost();
  return `${host}${path}`;
}
