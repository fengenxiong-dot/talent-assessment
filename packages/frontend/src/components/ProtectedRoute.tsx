import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { DevUserBar } from "./DevUserBar";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: Props) {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-screen">
        <p>正在登录...</p>
      </div>
    );
  }

  if (requireAdmin && !user.is_admin) {
    return (
      <div className="error-screen">
        <p>无权限访问</p>
      </div>
    );
  }

  return (
    <>
      <DevUserBar />
      {children}
    </>
  );
}
