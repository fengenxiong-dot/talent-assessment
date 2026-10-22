import { isMockMode } from "../hooks/useDingtalk";
import { useAuth } from "../hooks/useAuth";
import { setToken } from "../api/client";

export function DevUserBar() {
  const { logout } = useAuth();

  if (!isMockMode()) return null;

  // 从数据库查到的评价人姓名（从之前 seed 可以确认）
  const mockUsers = ["管理员", "陈三", "李四", "李二", "赵六", "张三", "王五"];

  function switchTo(name: string) {
    localStorage.setItem("mock_username", name);
    setToken(null);
    window.location.reload();
  }

  return (
    <div style={{
      display: "flex",
      gap: 8,
      padding: "6px 16px",
      background: "#fffbe6",
      borderBottom: "1px solid #ffe58f",
      alignItems: "center",
      fontSize: 13,
      flexWrap: "wrap",
    }}>
      <strong style={{ color: "#d48806" }}>开发模式 - 切换用户:</strong>
      {mockUsers.map((name) => (
        <button
          key={name}
          onClick={() => switchTo(name)}
          style={{
            padding: "2px 10px",
            border: "1px solid #d9d9d9",
            borderRadius: 4,
            background: "#fff",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {name}
        </button>
      ))}
      <button
        onClick={logout}
        style={{
          padding: "2px 10px",
          border: "1px solid #ff4d4f",
          borderRadius: 4,
          background: "#fff",
          cursor: "pointer",
          fontSize: 12,
          color: "#ff4d4f",
          marginLeft: "auto",
        }}
      >
        退出
      </button>
    </div>
  );
}
