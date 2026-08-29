/**
 * 中台 API 封装（跨域版）：GitHub Pages (banzheshenghuo.github.io)
 * → apiServer (banzheshenghuo.com) 为跨域调用，SameSite=Lax 的 cookie
 * 不会随请求携带，认证完全依赖 localStorage 里的 Bearer token。
 * API_KEY 是应用级标识（公开属性，不是机密），用户身份由登录 token 保证。
 */
// 默认走 www：裸域的 DNS 记录已清理，apiServer 仅保留 www 路由
const API_BASE = 'https://www.banzheshenghuo.com/api/c/v1';
const API_KEY = '5eb1e0a20cbeacce97ebe6f5eac67ea631a44b2844cf0364';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = 'bzsh_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      'X-API-Key': API_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401 说明会话失效：清 token 并刷新，让登录门重新接管
    if (res.status === 401) {
      setToken(null);
      if (!path.startsWith('/auth/')) window.location.reload();
    }
    throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}
