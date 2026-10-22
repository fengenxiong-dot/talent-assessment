import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginCallback() {
  const { login, loading, error } = useAuth();

  useEffect(() => {
    login();
  }, []);

  if (loading) return <div className="loading-screen"><p>登录中...</p></div>;
  if (error) return <div className="error-screen"><p>{error}</p></div>;
  return null;
}
