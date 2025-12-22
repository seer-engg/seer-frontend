export type TokenProvider = () => Promise<string | null>;
type JsonBody = Record<string, unknown> | unknown[];

interface BackendAPIClientOptions {
  baseUrl: string;
  tokenProvider?: TokenProvider;
}

interface BackendRequestInit extends Omit<RequestInit, "body" | "headers"> {
  body?: RequestInit["body"] | JsonBody;
  headers?: HeadersInit;
}

export class BackendAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "BackendAPIError";
  }
}

const ensureAbsoluteUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.includes("localhost") || url.startsWith("127.")) {
    return `http://${url}`;
  }

  return `https://${url}`;
};

const getBackendBaseUrl = (): string => {
  // Check for backend URL in query parameter (for self-hosted backend)
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const backendParam = urlParams.get("backend");
    if (backendParam) {
      return ensureAbsoluteUrl(backendParam);
    }
  }
  
  // Fall back to environment variable
  const envUrl = import.meta.env.VITE_BACKEND_API_URL;
  if (!envUrl) {
    throw new Error("VITE_BACKEND_API_URL is not set and no backend parameter provided in URL");
  }
  return ensureAbsoluteUrl(envUrl);
};

const defaultTokenProvider: TokenProvider = async () => {
  if (typeof window === "undefined") {
    return null;
  }
  const clerk = (window as WindowWithClerk).Clerk;
  if (!clerk?.session?.getToken) {
    return null;
  }
  try {
    return await clerk.session.getToken({template:"user-profile"});
  } catch (error) {
    console.warn("Failed to fetch Clerk token", error);
    return null;
  }
};

export const backendTokenProvider = defaultTokenProvider;
const shouldSerializeBody = (value: unknown): value is JsonBody => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  if (value instanceof FormData || value instanceof URLSearchParams || value instanceof Blob) {
    return false;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return false;
  }

  if (typeof ReadableStream !== "undefined" && value instanceof ReadableStream) {
    return false;
  }

  return true;
};

export class BackendAPIClient {
  private baseUrl: string;
  private tokenProvider?: TokenProvider;

  constructor(options: BackendAPIClientOptions) {
    this.baseUrl = ensureAbsoluteUrl(options.baseUrl);
    this.tokenProvider = options.tokenProvider;
  }

  setTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider;
  }

  private async getToken(): Promise<string | null> {
    const provider = this.tokenProvider ?? defaultTokenProvider;
    return provider ? provider() : null;
  }

  private toAbsoluteUrl(endpoint: string): string {
    const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalized}`;
  }

  async request<T>(endpoint: string, options: BackendRequestInit = {}): Promise<T> {
    const url = this.toAbsoluteUrl(endpoint);
    const token = await this.getToken();
    const { body: requestBody, headers: providedHeaders, ...restOptions } = options;

    let body = requestBody as RequestInit["body"] | undefined;
    if (requestBody && shouldSerializeBody(requestBody)) {
      body = JSON.stringify(requestBody);
    }

    const headers = new Headers(providedHeaders || {});
    if (!(body instanceof FormData)) {
      headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...restOptions,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type") || "";
    const responseBody = await response.text();

    if (!response.ok) {
      let errorPayload: unknown;
      if (responseBody) {
        try {
          errorPayload = JSON.parse(responseBody);
        } catch {
          errorPayload = responseBody;
        }
      }
      const detail =
        typeof errorPayload === "object" &&
        errorPayload !== null &&
        "detail" in errorPayload &&
        typeof (errorPayload as { detail?: unknown }).detail === "string"
          ? (errorPayload as { detail: string }).detail
          : undefined;
      const message: string = detail ?? response.statusText ?? `HTTP ${response.status}`;
      throw new BackendAPIError(message, response.status, errorPayload);
    }

    if (!responseBody) {
      return undefined as T;
    }

    if (!contentType.includes("application/json")) {
      if (responseBody.trim().startsWith("<!doctype") || responseBody.includes("<html")) {
        throw new BackendAPIError(
          `Received HTML instead of JSON from ${url}. Check backend availability.`,
          response.status,
          { url, contentType },
        );
      }
      throw new BackendAPIError(
        `Unsupported content type: ${contentType || "unknown"}`,
        response.status,
        { url, contentType, body: responseBody },
      );
    }

    try {
      return JSON.parse(responseBody) as T;
    } catch (error) {
      throw new BackendAPIError(
        "Failed to parse JSON response",
        response.status,
        { url, rawBody: responseBody, error: error instanceof Error ? error.message : error },
      );
    }
  }
}

export const backendApiClient = new BackendAPIClient({
  baseUrl: getBackendBaseUrl(),
});

interface WindowWithClerk extends Window {
  Clerk?: {
    session?: {
      getToken: (options?: Record<string, unknown>) => Promise<string | null>;
    };
  };
}


