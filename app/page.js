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

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const pricePerDay = form.plan === "personal" ? 9 : 6;
  const amount = pricePerDay * Number(form.days || 1);

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
    setTimeout(() => setMessage(""), 2200);
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
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (data.ok) setOrders(data.orders || []);
  }

  async function login(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim() }),
      });
      const data = await response.json();

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
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrders([]);
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
    if (saving) return;

    setSaving(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        notify(data.message || "Save failed");
        return;
      }

      setOrders((prev) => [data.order, ...prev]);
      setForm(emptyForm);
      setOpen(false);
      notify("Order saved");
    } catch {
      notify("Server connection failed");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return <Shell><CenterCard title="Loading" text="Checking session" /></Shell>;
  }

  if (!user) {
    return (
      <Shell>
        <section className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4">
          <form onSubmit={login} className="w-full border border-emerald-300/45 bg-white/[0.07] p-5 shadow-[0_0_45px_rgba(16,185,129,0.22)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/80">GPT Panel</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Login</h1>
            <input
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="মোবাইল নাম্বার"
              className="mt-5 h-11 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-sm text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-200"
            />
            <button disabled={loading} className="mt-3 h-11 w-full border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-xs font-black uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60">
              {loading ? "Checking" : "Login"}
            </button>
          </form>
        </section>
        {message && <Toast text={message} />}
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-emerald-300/40 bg-white/[0.07] p-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/75">GPT Customer Data Center</p>
            <h1 className="mt-1 text-2xl font-black text-white">User Panel</h1>
            <p className="mt-1 text-xs text-emerald-100/65">{user.mobile}</p>
          </div>
          <div className="flex gap-2">
            {user.role === "admin" && <a href="/admin" className="border border-cyan-300/45 px-4 py-2 text-xs font-bold text-cyan-100">Admin</a>}
            <button onClick={logout} className="border border-emerald-300/45 px-4 py-2 text-xs font-bold text-emerald-100">Logout</button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Orders" value={summary.orders} />
          <Stat title="Amount" value={`৳${summary.amount}`} />
          <Stat title="Running" value={summary.running} />
          <Stat title="Remaining" value={summary.left} />
        </section>

        <section className="mt-4 overflow-hidden border border-emerald-300/40 bg-white/[0.07] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-emerald-300/30 p-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">Orders Table</h2>
            <span className="text-xs text-emerald-100/65">Total: {orders.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-emerald-300/10 text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Mobile</th>
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
                  <tr><td colSpan="8" className="px-3 py-10 text-center text-emerald-100/50">0</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="border-t border-emerald-300/20 text-emerald-50/90">
                    <td className="px-3 py-3 font-bold text-white">{order.customerName}</td>
                    <td className="px-3 py-3">{order.orderMobile}</td>
                    <td className="px-3 py-3 capitalize">{order.plan}</td>
                    <td className="px-3 py-3">{order.runningDays}/{order.days}</td>
                    <td className="px-3 py-3">৳{order.amount}</td>
                    <td className="px-3 py-3">{order.useCases?.join(", ")}</td>
                    <td className="px-3 py-3">{order.remainingDays}</td>
                    <td className="px-3 py-3">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-300 to-cyan-300 text-3xl font-light text-slate-950 shadow-[0_0_35px_rgba(45,212,191,0.45)]">+</button>
      </main>

      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={saveOrder} className="w-full max-w-lg border border-emerald-300/45 bg-[#06111f] p-4 shadow-[0_0_60px_rgba(16,185,129,0.28)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/70">New Order</p>
                <h2 className="text-xl font-black text-white">Package Form</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="border border-emerald-300/40 px-3 py-1 text-xs text-emerald-100">Close</button>
            </div>

            <div className="grid gap-2">
              <Input value={form.customerName} onChange={(value) => updateForm("customerName", value)} placeholder="ইউজারের নাম" />
              <Input value={form.orderMobile} onChange={(value) => updateForm("orderMobile", value.replace(/\D/g, "").slice(0, 11))} placeholder="মোবাইল নাম্বার" />
              <Input value={form.email} onChange={(value) => updateForm("email", value)} placeholder="ইমেল" />

              <div className="grid grid-cols-2 gap-2">
                {["share", "personal"].map((plan) => (
                  <button key={plan} type="button" onClick={() => updateForm("plan", plan)} className={`h-10 border text-xs font-bold uppercase tracking-wider ${form.plan === plan ? "border-emerald-200 bg-emerald-300/30 text-emerald-50" : "border-emerald-300/45 bg-white/[0.06] text-emerald-100/80"}`}>
                    {plan}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border border-emerald-300/45 bg-white/[0.07] p-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-100/70">Days</p>
                  <h3 className="mt-1 text-3xl font-black text-emerald-100">{form.days}</h3>
                  <input type="range" min="1" max="30" value={form.days} onChange={(event) => updateForm("days", Number(event.target.value))} className="mt-2 w-full" />
                </div>
                <div className="border border-emerald-300/45 bg-white/[0.07] p-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-100/70">Amount</p>
                  <h3 className="mt-1 text-3xl font-black text-emerald-100">৳{amount}</h3>
                  <p className="mt-2 text-xs text-cyan-100">৳{pricePerDay}/day × {form.days}</p>
                </div>
              </div>

              <div className="border border-emerald-300/45 bg-white/[0.07] p-3">
                <div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-emerald-100/70">
                  <span>Use Case</span><span>{form.useCases.length}/3</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {useCases.map((item) => {
                    const selected = form.useCases.includes(item);
                    return <button key={item} type="button" onClick={() => toggleUseCase(item)} className={`min-h-8 border px-1 text-[10px] ${selected ? "border-emerald-200 bg-emerald-300/30 text-white" : "border-emerald-300/45 bg-white/[0.06] text-emerald-100/80"}`}>{item}</button>;
                  })}
                </div>
              </div>
            </div>

            <button disabled={saving} className="mt-3 h-11 w-full border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-xs font-black uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60">
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
  return <div className="min-h-screen bg-[#06111f] text-white">{children}</div>;
}

function CenterCard({ title, text }) {
  return <div className="grid min-h-screen place-items-center"><div className="border border-emerald-300/45 bg-white/[0.07] p-5 text-center"><h1 className="text-xl font-black">{title}</h1><p className="mt-1 text-xs text-emerald-100/65">{text}</p></div></div>;
}

function Toast({ text }) {
  return <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-emerald-300/45 bg-slate-950/90 px-4 py-2 text-xs font-bold text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.25)]">{text}</div>;
}

function Stat({ title, value }) {
  return <div className="border border-emerald-300/40 bg-white/[0.07] p-3 backdrop-blur-xl"><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/60">{title}</p><h2 className="mt-1 text-2xl font-black text-white">{value}</h2></div>;
}

function Input({ value, onChange, placeholder }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-xs text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-200" />;
}
