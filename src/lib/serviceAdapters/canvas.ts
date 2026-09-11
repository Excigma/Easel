const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_CANVAS_AUTHORITY = "canvas.auckland.ac.nz";

let requestQueue: Promise<void> = Promise.resolve();

export class CanvasRateLimitError extends Error {}

export function fetchCanvasText(
  url: string,
  retryOnRateLimit = true,
): Promise<string> {
  const request = requestQueue.then(() =>
    fetchCanvasTextNow(url, retryOnRateLimit),
  );
  requestQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

export function validateCanvasTokenUrl(
  value: string,
  pathPrefix: string,
  pathSuffix: string,
): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (
    url.protocol !== "https:" ||
    url.host.toLowerCase() !== canvasAuthority() ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.pathname.startsWith(pathPrefix) ||
    !url.pathname.endsWith(pathSuffix)
  ) {
    return false;
  }

  const token = url.pathname.slice(
    pathPrefix.length,
    url.pathname.length - pathSuffix.length,
  );
  return token.length > 0 && /^[a-zA-Z0-9_-]+$/.test(token);
}

async function fetchCanvasTextNow(
  url: string,
  retryOnRateLimit: boolean,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const remaining = numericHeader(response.headers, "X-Rate-Limit-Remaining");
    const throttled =
      response.status === 429 ||
      (response.status === 403 && remaining !== undefined && remaining <= 0);

    if (throttled) {
      await response.body?.cancel().catch(() => undefined);
      if (!retryOnRateLimit) throw new CanvasRateLimitError();
      if (attempt === MAX_ATTEMPTS - 1) break;

      const retryAfter =
        retryAfterMilliseconds(response.headers) ?? 1_000 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Canvas returned HTTP ${response.status}`);
    }

    return response.text();
  }

  throw new Error(
    `Canvas rate limit remained exceeded after ${MAX_ATTEMPTS} attempts`,
  );
}

function retryAfterMilliseconds(headers: Headers): number | undefined {
  const value = headers.get("Retry-After");
  if (value === null) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function numericHeader(headers: Headers, name: string): number | undefined {
  const header = headers.get(name);
  if (header === null) return undefined;

  const value = Number(header);
  return Number.isFinite(value) ? value : undefined;
}

function canvasAuthority(): string {
  const configured =
    process.env.CANVAS_BASE_URL?.trim() || DEFAULT_CANVAS_AUTHORITY;
  const url = new URL(
    configured.includes("://") ? configured : `https://${configured}`,
  );

  if (url.protocol !== "https:" || !url.host) {
    throw new Error("CANVAS_BASE_URL must be an HTTPS hostname or URL");
  }

  return url.host.toLowerCase();
}
