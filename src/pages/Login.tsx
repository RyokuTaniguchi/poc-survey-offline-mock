import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("user@example.com");
  const [pass, setPass] = useState("password");
  const token = typeof window !== "undefined" ? sessionStorage.getItem("mockToken") : null;

  useEffect(() => {
    if (token) {
      navigate("/survey/home", { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sessionStorage.setItem("mockToken", "ok");
    sessionStorage.setItem("mockUserEmail", user.trim());
    sessionStorage.removeItem("mockHospitalName");
    sessionStorage.removeItem("surveyActive");
    sessionStorage.removeItem("visitedDepartment");
    navigate("/survey/home", { replace: true });
  };

  return (
    <div className="page" style={{ justifyContent: "center", alignItems: "center" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <h2>ログイン</h2>
        <form className="grid" onSubmit={handleSubmit}>
          <label>
            メールアドレス
            <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </label>
          <label>
            パスワード
            <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" autoComplete="current-password" />
          </label>
          <button type="submit">ログイン</button>
        </form>
      </div>
    </div>
  );
}

