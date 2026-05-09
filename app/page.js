"use client";

import React, { useEffect, useMemo, useState } from "react";

const useCases = [
  "Coding",
  "Analysis",
  "Study",
  "Writing",
  "Research",
  "Graphics",
  "Business",
  "Marketing",
  "Translation",
  "Data Work",
  "Automation",
  "Brainstorming",
];

const emptyForm = {
  customerName: "",
  orderMobile: "",
  email: "",
  plan: "share",
  days: 7,
  useCases: [],
};

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" });
}

export default function Page() {
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const pricePerDay = form.plan === "personal" ? 9 : 6;
  const totalAmount = pricePerDay * Number(form.days || 1);
  const rangePercent = ((Number(form.days || 1) - 1) / 29) * 100;

  const canLogin = /^01\d{9}$/.test(mobile.trim());
  const canOrder =
    form.customerName.trim() &&
    /^01\d{9}$/.test(form.orderMobile.trim()) &&
    form.email.trim().includes("@") &&
    form.useCases.length === 3;

  const summary = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter((order) => order.status === "active").length,
      pending: orders.filter((order) => order.status === "pending").length,
      amount: orders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
    };
  }, [orders]);

  useEffect(() => {
    loadMe();
  }, []);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }

  async function loadMe() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setChecking(false);
        return;
      }

      const data = await response.json();
      if (data.ok && data.user) {
        setUser(data.user);
        await loadOrders();
      }
    } catch {
      showToast("Connection check failed");
    } finally {
      setChecking(false);
    }
  }

  async function loadOrders() {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (data.ok) setOrders(data.orders || []);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!canLogin || loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim() }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        showToast(data.message || "Login failed");
        return;
      }

      setUser(data.user);
      setMobile("");
      await loadOrders();
      showToast("Login successful");
    } catch {
      showToast("Server connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrders([]);
  }

  function toggleUseCase(item) {
    setForm((prev) => {
      if (prev.useCases.includes(item)) {
        return { ...prev, useCases: prev.useCases.filter((value) => value !== item) };
      }
      if (prev.useCases.length >= 3) return prev;
      return { ...prev, useCases: [...prev.useCases, item] };
    });
  }

  async function handleOrder(event) {
    event.preventDefault();
    if (!canOrder || orderLoading) return;

    setOrderLoading(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        showToast(data.message || "Order failed");
        return;
      }

      setOrders((prev) => [data.order, ...prev]);
      setForm(emptyForm);
      setModalOpen(false);
      showToast("Order saved");
    } catch {
      showToast("Order save failed");
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&display=swap");

        body {
          font-family: "Oxanium", sans-serif;
          background: #06111f;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 5px;
          outline: none;
          background: linear-gradient(
            90deg,
            #34d399 ${rangePercent}%,
            rgba(255, 255, 255, 0.12) ${rangePercent}%
          );
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          background: #a7f3d0;
          border: 2px solid #10b981;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(52, 211, 153, 0.9);
        }

        input[type="range"]::-moz-range-thumb {
          width: 15px;
          height: 15px;
          background: #a7f3d0;
          border: 2px solid #10b981;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(52, 211, 153, 0.9);
        }

        @keyframes fallingGrid {
          0% { transform: translateY(-48px); }
          100% { transform: translateY(48px); }
        }

        @keyframes spinGlow {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.22),transparent_34%),linear-gradient(135deg,#071a2f_0%,#082f2a_45%,#0f172a_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div
          className="absolute inset-[-60px] bg-[linear-gradient(rgba(134,239,172,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.13)_1px,transparent_1px)] bg-[size:24px_24px]"
          style={{ animation: "fallingGrid 3.2s linear infinite" }}
        />
      </div>
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/10 blur-[90px]" />

      {toast && (
        <div className="fixed left-1/2 top-4 z-[80] -translate-x-1/2 border border-emerald-300/60 bg-emerald-950/90 px-4 py-2 text-[11px] text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
          {toast}
        </div>
      )}

      <section className="relative z-10 min-h-screen px-4 py-5">
        {checking ? (
          <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
            <div className="mb-4 h-12 w-12 border-2 border-emerald-300/20 border-t-emerald-300" style={{ animation: "spinGlow 0.8s linear infinite" }} />
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Checking</p>
          </div>
        ) : !user ? (
          <div className="flex min-h-[85vh] items-center justify-center">
            <form
              onSubmit={handleLogin}
              className="w-full max-w-[292px] border border-emerald-300/40 bg-gradient-to-br from-cyan-950/55 via-emerald-950/45 to-slate-900/60 p-3 shadow-[0_0_45px_rgba(16,185,129,0.18)] backdrop-blur-2xl sm:max-w-[305px]"
            >
              <p className="mb-2 text-center text-[10px] uppercase tracking-[0.28em] text-cyan-200/80">User Login</p>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 11))}
                className="h-9 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
              />
              <button
                type="submit"
                disabled={!canLogin || loading}
                className={`mt-3 h-9 w-full border text-[11px] font-bold uppercase tracking-[0.22em] transition ${
                  canLogin && !loading
                    ? "border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:brightness-110 active:scale-[0.99]"
                    : "cursor-not-allowed border-emerald-300/30 bg-white/[0.07] text-white/30"
                }`}
              >
                {loading ? "Loading" : "Login"}
              </button>
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl pb-24">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-emerald-300/40 bg-gradient-to-br from-cyan-950/55 via-emerald-950/45 to-slate-900/60 p-3 shadow-[0_0_45px_rgba(16,185,129,0.18)] backdrop-blur-2xl">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/80">User Panel</p>
                <h1 className="mt-1 text-xl font-bold text-emerald-100">{user.mobile}</h1>
              </div>
              <div className="flex items-center gap-2">
                {user.role === "admin" && (
                  <a href="/admin" className="border border-emerald-300/45 bg-white/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-300/15">
                    Admin
                  </a>
                )}
                <button onClick={handleLogout} className="border border-red-300/40 bg-red-950/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-100 hover:bg-red-400/15">
                  Logout
                </button>
              </div>
            </header>

            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat title="Total" value={summary.total} />
              <Stat title="Pending" value={summary.pending} />
              <Stat title="Active" value={summary.active} />
              <Stat title="Amount" value={`৳${summary.amount}`} />
            </div>

            <div className="overflow-hidden border border-emerald-300/40 bg-gradient-to-br from-cyan-950/45 via-emerald-950/35 to-slate-900/55 shadow-[0_0_45px_rgba(16,185,129,0.14)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-emerald-300/25 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">Orders Table</p>
                <p className="text-[10px] text-cyan-100/65">{orders.length} Records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[11px]">
                  <thead className="bg-white/[0.06] text-emerald-100/80">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Mobile</th>
                      <th className="px-3 py-2 font-medium">Plan</th>
                      <th className="px-3 py-2 font-medium">Days</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Use Cases</th>
                      <th className="px-3 py-2 font-medium">Remaining</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-3 py-8 text-center text-emerald-100/50">0 Orders</td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-t border-emerald-300/15 text-emerald-50/90">
                          <td className="px-3 py-2">{order.customerName}</td>
                          <td className="px-3 py-2">{order.orderMobile}</td>
                          <td className="px-3 py-2 capitalize">{order.plan}</td>
                          <td className="px-3 py-2">{order.days}</td>
                          <td className="px-3 py-2">৳{order.amount}</td>
                          <td className="px-3 py-2">{order.useCases?.join(", ")}</td>
                          <td className="px-3 py-2">{order.remainingDays}</td>
                          <td className="px-3 py-2 capitalize">{order.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-3xl font-light leading-none text-slate-950 shadow-[0_0_35px_rgba(45,212,191,0.35)] hover:brightness-110 active:scale-95"
              aria-label="Add order"
            >
              +
            </button>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 px-4 py-6 backdrop-blur-md">
          <form onSubmit={handleOrder} className="w-full max-w-[390px] border border-emerald-300/40 bg-gradient-to-br from-slate-900 via-emerald-950 to-cyan-950 p-4 shadow-[0_0_55px_rgba(52,211,153,0.22)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">New Order</p>
                <h2 className="mt-1 text-base font-bold text-emerald-100">Package Form</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="border border-emerald-300/35 bg-white/[0.07] px-2 py-1 text-xs text-white/70 hover:border-red-300/50 hover:text-red-200">✕</button>
            </div>

            <div className="space-y-2">
              <Input placeholder="User Name" value={form.customerName} onChange={(value) => setForm((prev) => ({ ...prev, customerName: value }))} />
              <Input placeholder="Mobile Number" value={form.orderMobile} onChange={(value) => setForm((prev) => ({ ...prev, orderMobile: value.replace(/\D/g, "").slice(0, 11) }))} />
              <Input placeholder="Email" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />

              <div className="border border-emerald-300/45 bg-white/[0.07] px-2.5 py-2">
                <label className="mb-1.5 block text-[9px] uppercase tracking-widest text-emerald-100/80">Plan</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["share", "personal"].map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, plan }))}
                      className={`h-8 border text-[10px] font-medium uppercase tracking-wider transition-all ${
                        form.plan === plan
                          ? "border-emerald-200 bg-emerald-300/30 text-emerald-50 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                          : "border-emerald-300/45 bg-white/[0.06] text-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-300/10"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border border-emerald-300/45 bg-white/[0.07] px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-100/80">Days</p>
                  <div className="my-1 flex items-end gap-1">
                    <h2 className="text-2xl font-bold leading-none text-emerald-200">{form.days}</h2>
                    <span className="text-[11px] font-semibold text-emerald-300">day{form.days > 1 ? "s" : ""}</span>
                  </div>
                  <input type="range" min="1" max="30" value={form.days} onChange={(event) => setForm((prev) => ({ ...prev, days: Number(event.target.value) }))} className="cursor-pointer" />
                </div>

                <div className="border border-emerald-300/45 bg-gradient-to-r from-emerald-400/15 to-cyan-400/10 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-100">Amount</p>
                  <h2 className="mt-1 text-2xl font-bold leading-none text-emerald-200">৳{totalAmount}</h2>
                  <p className="mt-1 text-[11px] font-semibold text-cyan-200">৳{pricePerDay}/day</p>
                  <p className="text-[9px] text-emerald-100/70">{form.days} × ৳{pricePerDay}</p>
                </div>
              </div>

              <div className="border border-emerald-300/45 bg-white/[0.07] px-2.5 py-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-100/80">Use Case</p>
                  <p className="text-[10px] text-cyan-100/65">{form.useCases.length}/3</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {useCases.map((item) => {
                    const selected = form.useCases.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleUseCase(item)}
                        className={`min-h-[30px] border px-1 text-[10px] transition-all duration-200 ${
                          selected
                            ? "border-emerald-200 bg-emerald-300/30 text-emerald-50 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                            : "border-emerald-300/45 bg-white/[0.06] text-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-300/10"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canOrder || orderLoading}
              className={`mt-3 h-10 w-full border text-[11px] font-bold uppercase tracking-[0.22em] transition ${
                canOrder && !orderLoading
                  ? "border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:brightness-110 active:scale-[0.99]"
                  : "cursor-not-allowed border-emerald-300/30 bg-white/[0.07] text-white/30"
              }`}
            >
              {orderLoading ? "Saving" : "Order"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <div className="border border-emerald-300/40 bg-white/[0.07] px-3 py-3 backdrop-blur-xl">
      <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-100/65">{title}</p>
      <h2 className="mt-1 text-xl font-bold text-emerald-100">{value}</h2>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
    />
  );
}
