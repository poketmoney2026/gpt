"use client";

import { useEffect, useMemo, useState } from "react";

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
  "Content Creation",
  "Office Work",
  "Learning",
  "Programming Help",
];

const emptyForm = {
  customerName: "",
  orderMobile: "",
  email: "",
  plan: "share",
  days: 1,
  useCases: [],
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" });
}

function mobileOnly(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const pricePerDay = form.plan === "personal" ? 9 : 6;
  const amount = pricePerDay * Number(form.days || 1);
  const rangePercent = ((Number(form.days || 1) - 1) / 29) * 100;
  const canSave =
    form.customerName.trim().length > 1 &&
    form.orderMobile.length === 11 &&
    form.email.includes("@") &&
    form.useCases.length === 3 &&
    !saving;

  const summary = useMemo(() => {
    return {
      orders: orders.length,
      amount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      running: orders.reduce((sum, item) => sum + Number(item.runningDays || 0), 0),
      left: orders.reduce((sum, item) => sum + Number(item.remainingDays || 0), 0),
    };
  }, [orders]);

  useEffect(() => {
    checkSession();
  }, []);

  function notify(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2300);
  }

  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.user) {
          setUser(data.user);
          await loadOrders();
        }
      }
    } catch {
      notify("Connection failed");
    } finally {
      setChecking(false);
    }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) {
        setOrders(data.orders || []);
      }
    } catch {
      notify("Orders load failed");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    if (loginLoading) return;

    setLoginLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileOnly(mobile) }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        notify(data.message || "Login failed");
        return;
      }

      setUser(data.user);
      setMobile("");
      await loadOrders();
      notify("Login successful");
    } catch {
      notify("Server connection failed");
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrders([]);
    setForm(emptyForm);
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  async function saveOrder(event) {
    event.preventDefault();
    if (!canSave) {
      notify("Complete the form");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        orderMobile: mobileOnly(form.orderMobile),
        days: Number(form.days),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        notify(data.message || "Order save failed");
        return;
      }

      setOrders((prev) => [data.order, ...prev]);
      setForm(emptyForm);
      setOpen(false);
      notify("Order saved successfully");
    } catch {
      notify("Server connection failed");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <Shell>
        <LoadingScreen title="Loading" text="Checking secure session" />
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm items-center px-4">
          <form onSubmit={login} className="glass-card w-full p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/80">GPT Panel</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Login</h1>
            <div className="mt-5 space-y-2">
              <input
                value={mobile}
                onChange={(event) => setMobile(mobileOnly(event.target.value))}
                placeholder="মোবাইল নাম্বার"
                inputMode="numeric"
                className="form-input h-11 text-sm"
              />
              <button disabled={loginLoading} className="primary-btn h-11 w-full text-xs font-black uppercase tracking-[0.28em]">
                {loginLoading ? "Checking" : "Login"}
              </button>
            </div>
          </form>
        </section>
        {message && <Toast text={message} />}
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5 md:py-7">
        <header className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/75">GPT Customer Data Center</p>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">User Panel</h1>
            <p className="mt-1 text-xs text-emerald-100/65">{user.mobile}</p>
          </div>
          <div className="flex gap-2">
            {user.role === "admin" && (
              <a href="/admin" className="ghost-btn px-4 py-2 text-xs font-bold text-cyan-100">Admin</a>
            )}
            <button onClick={logout} className="ghost-btn px-4 py-2 text-xs font-bold">Logout</button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Orders" value={summary.orders} />
          <Stat title="Amount" value={`৳${summary.amount}`} />
          <Stat title="Running" value={summary.running} />
          <Stat title="Remaining" value={summary.left} />
        </section>

        <section className="glass-card mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-emerald-300/30 p-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">Orders Table</h2>
              <p className="mt-1 text-[10px] text-emerald-100/55">Live database records</p>
            </div>
            <button onClick={loadOrders} className="ghost-btn px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Refresh</button>
          </div>

          {ordersLoading ? (
            <TableLoading rows={5} />
          ) : (
            <div className="mini-scroll overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-emerald-300/10 text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                  <tr>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Mobile</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Days</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Use Case</th>
                    <th className="px-3 py-3">Left</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-3 py-12 text-center">
                        <div className="mx-auto w-fit border border-emerald-300/35 bg-white/[0.06] px-8 py-5 text-2xl font-black text-emerald-100/55">0</div>
                      </td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr key={order.id} className="border-t border-emerald-300/20 text-emerald-50/90 transition hover:bg-emerald-300/5">
                      <td className="px-3 py-3 font-bold text-white">{order.customerName}</td>
                      <td className="px-3 py-3">{order.orderMobile}</td>
                      <td className="px-3 py-3">{order.email}</td>
                      <td className="px-3 py-3 capitalize"><Badge>{order.plan}</Badge></td>
                      <td className="px-3 py-3">{order.runningDays}/{order.days}</td>
                      <td className="px-3 py-3 font-bold text-emerald-100">৳{order.amount}</td>
                      <td className="px-3 py-3">{order.useCases?.join(", ")}</td>
                      <td className="px-3 py-3">{order.remainingDays}</td>
                      <td className="px-3 py-3">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-20 grid h-14 w-14 place-items-center rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-300 to-cyan-300 text-3xl font-light text-slate-950 shadow-[0_0_35px_rgba(45,212,191,0.45)] transition hover:scale-105"
          aria-label="Add order"
        >
          +
        </button>
      </main>

      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-md">
          <form onSubmit={saveOrder} className="glass-card mini-scroll max-h-[92vh] w-full max-w-[560px] overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">New Order</p>
                <h2 className="text-xl font-black text-white">Package Form</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="ghost-btn px-3 py-1 text-xs">Close</button>
            </div>

            <div className="grid gap-2">
              <input value={form.customerName} onChange={(event) => updateForm("customerName", event.target.value)} placeholder="ইউজারের নাম" className="form-input" />
              <input value={form.orderMobile} onChange={(event) => updateForm("orderMobile", mobileOnly(event.target.value))} placeholder="মোবাইল নাম্বার" inputMode="numeric" className="form-input" />
              <input value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="ইমেল" className="form-input" />

              <div className="soft-panel p-2.5">
                <p className="mb-1.5 text-[9px] uppercase tracking-widest text-emerald-100/80">Package Type</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "share", label: "Share", price: 6 },
                    { key: "personal", label: "Personal", price: 9 },
                  ].map((plan) => (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => updateForm("plan", plan.key)}
                      className={`h-9 border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        form.plan === plan.key
                          ? "border-emerald-200 bg-emerald-300/30 text-emerald-50 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                          : "border-emerald-300/45 bg-white/[0.06] text-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-300/10"
                      }`}
                    >
                      {plan.label} · ৳{plan.price}/day
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="soft-panel px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-100/80">Days</p>
                  <div className="my-1 flex items-end gap-1">
                    <h2 className="text-2xl font-bold leading-none text-emerald-200">{form.days}</h2>
                    <span className="text-[11px] font-semibold text-emerald-300">day{form.days > 1 ? "s" : ""}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={form.days}
                    onChange={(event) => updateForm("days", Number(event.target.value))}
                    className="cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #34d399 ${rangePercent}%, rgba(255,255,255,0.12) ${rangePercent}%)` }}
                  />
                </div>

                <div className="border border-emerald-300/45 bg-gradient-to-r from-emerald-400/15 to-cyan-400/10 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-100">Amount</p>
                  <h2 className="mt-1 text-2xl font-bold leading-none text-emerald-200">৳{amount}</h2>
                  <p className="mt-1 text-[11px] font-semibold text-cyan-200">৳{pricePerDay}/day</p>
                  <p className="text-[9px] text-emerald-100/70">{form.days} × ৳{pricePerDay}</p>
                </div>
              </div>

              <div className="soft-panel p-3">
                <div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-emerald-100/70">
                  <span>Use Case</span><span>{form.useCases.length}/3</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {useCases.map((item) => {
                    const selected = form.useCases.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleUseCase(item)}
                        className={`min-h-8 border px-1 text-[10px] transition-all duration-200 ${
                          selected
                            ? "border-emerald-200 bg-emerald-300/30 text-white shadow-[0_0_15px_rgba(52,211,153,0.25)]"
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

            <button disabled={!canSave} className="primary-btn mt-3 h-11 w-full text-xs font-black uppercase tracking-[0.28em]">
              {saving ? "Saving" : "Order"}
            </button>
          </form>
        </div>
      )}

      {message && <Toast text={message} />}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="animated-shell">
      <div className="animated-bg" />
      <div className="grid-bg" />
      <div className="center-glow" />
      {children}
    </div>
  );
}

function LoadingScreen({ title, text }) {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 text-center">
      <div className="glass-card flex min-h-[250px] w-full max-w-[330px] flex-col items-center justify-center p-5">
        <div className="loader-ring mb-4" />
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">{title}</p>
        <p className="mt-2 text-[10px] text-cyan-100/60" style={{ animation: "blink 1s ease-in-out infinite" }}>{text}</p>
      </div>
    </div>
  );
}

function TableLoading({ rows = 4 }) {
  return (
    <div className="p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="mb-2 grid grid-cols-4 gap-2 md:grid-cols-8">
          {Array.from({ length: 8 }).map((__, cell) => (
            <div key={cell} className="shimmer-box h-8 border border-emerald-300/15" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Toast({ text }) {
  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-emerald-300/60 bg-emerald-950/90 px-4 py-2 text-[11px] font-bold text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
      {text}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="soft-panel p-3 transition hover:bg-emerald-300/10" style={{ animation: "pulseGlow 3s ease-in-out infinite" }}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/60">{title}</p>
      <h2 className="mt-1 text-2xl font-black text-white">{value}</h2>
    </div>
  );
}

function Badge({ children }) {
  return <span className="border border-emerald-300/45 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold text-emerald-100">{children}</span>;
}
