const TOKEN_KEY = "B!1w6NAt1T^%kvhUI*S^rC";

// =======================
// Token helpers
// =======================
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// =======================
// Error custom
// =======================
export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(status: number, payload: any) {
    super(payload?.error || `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
  }
}



export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();  // Obtiene el token desde el localStorage

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Siempre usar rutas relativas para que el proxy de Vite maneje CORS
  // Las URLs absolutas bypassean el proxy y causan errores CORS
  const url = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text().catch(() => "");
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }

  return payload as T;
}
