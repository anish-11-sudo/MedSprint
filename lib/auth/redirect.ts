const redirectOrigin = "https://medsprint.invalid";

export function safeRedirectPath(path: string | null, fallback: string) {
  if (!path?.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }

  const url = new URL(path, redirectOrigin);
  if (url.origin !== redirectOrigin) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
