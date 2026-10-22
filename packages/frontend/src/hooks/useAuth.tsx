import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, setToken, getToken } from "../api/client";
import { useDingtalk, isMockMode } from "./useDingtalk";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dingtalk = useDingtalk();

  // 登录函数
  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const code = await dingtalk.getAuthCode();
      const result = await api.login(code, localStorage.getItem("mock_username") || undefined);
      setToken(result.token);
      setUser(result.user);

      // 跳转到对应的首页
      if (result.user.is_admin) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/evaluator", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      // Mock 模式下提供 fallback
      if (isMockMode()) {
        const mockUser: User = {
          id: "mock-admin-id",
          name: "管理员",
          dingtalk_id: "mock_dt_admin",
          is_admin: true,
        };
        setToken("mock_token_dev");
        setUser(mockUser);
        navigate("/admin", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [dingtalk, navigate]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  // 初始化：检查是否已有 token
  useEffect(() => {
    if (location.pathname === "/login/callback") {
      // 钉钉免登回调：URL 中带 code 参数
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      if (code) {
        api
          .login(code)
          .then((result) => {
            setToken(result.token);
            setUser(result.user);
            if (result.user.is_admin) {
              navigate("/admin", { replace: true });
            } else {
              navigate("/evaluator", { replace: true });
            }
          })
          .catch(async () => {
            // 钉钉回调 code 失败，尝试重新获取
            try {
              const newCode = await dingtalk.getAuthCode();
              const result = await api.login(newCode);
              setToken(result.token);
              setUser(result.user);
              if (result.user.is_admin) {
                navigate("/admin", { replace: true });
              } else {
                navigate("/evaluator", { replace: true });
              }
            } catch {
              setError("登录失败，请重新打开应用");
            }
          })
          .finally(() => setLoading(false));
      } else {
        login();
      }
    } else {
      const token = getToken();
      if (token) {
        api
          .me()
          .then(setUser)
          .catch(() => {
            // token 失效，尝试重新登录
            login();
          })
          .finally(() => setLoading(false));
      } else {
        login();
      }
    }
  }, []); // 只在挂载时执行一次

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
