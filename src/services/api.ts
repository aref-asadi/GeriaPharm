import { registrySchema, type DrugRecord } from "../types/types";
import { replaceRegistry } from "./db";
export interface Session {
  user: { email: string } | null;
  csrfToken?: string;
  expiresAt?: number;
}
export interface Registry {
  medications: DrugRecord[];
  revision: number;
  updatedAt: string;
}
let csrf = "";
let revision: number | undefined;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...init,
      credentials: "same-origin",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.",
      0,
    );
  }
  const json = await response
    .json()
    .catch(() => ({ message: "پاسخ سرور معتبر نیست." }));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      csrf = "";
      window.dispatchEvent(new Event("gp-session-expired"));
    }
    throw new ApiError(
      json.message || "انجام درخواست ناموفق بود.",
      response.status,
    );
  }
  return json;
}
export async function getSession() {
  const result = await request<Session>("/auth/session");
  csrf = result.csrfToken ?? "";
  return result;
}
export async function login(email: string, password: string) {
  const result = await request<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  csrf = result.csrfToken ?? "";
  return result;
}
export async function logout() {
  await request("/auth/logout", { method: "POST" });
  csrf = "";
}
export async function syncRegistry() {
  const result = await request<Registry>("/registry");
  result.medications = registrySchema.parse(result.medications);
  revision = result.revision;
  return result;
}
export async function cacheRegistry(rows: DrugRecord[]) {
  try {
    await replaceRegistry(rows);
    return true;
  } catch {
    return false;
  }
}
async function mutate(path: string, method: string, body?: unknown) {
  const result = await request<Registry>(path, {
    method,
    headers: revision === undefined ? {} : { "If-Match": String(revision) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  revision = result.revision;
  return result;
}
export const saveMedication = (d: DrugRecord) =>
  mutate("/admin/medications/" + encodeURIComponent(d.id), "PUT", d);
export const deleteMedication = (id: string) =>
  mutate("/admin/medications/" + encodeURIComponent(id), "DELETE");
export const replaceServerRegistry = (medications: DrugRecord[]) =>
  mutate("/admin/registry", "PUT", { medications });
export const resetServerRegistry = () => mutate("/admin/reset", "POST");
