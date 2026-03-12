import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/portfolio" replace />;
  }

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/portfolio", { replace: true });
    } catch (err) {
      const message = err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || "Registration failed.";
      setError(message);
    }
  };

  return (
    <section className="mx-auto mt-10 w-full max-w-md">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-slate-900">Register</h1>
        <p className="mt-1 text-sm text-slate-500">Create your account to access AUTO INVEST.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input name="username" value={form.username} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-900">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}
