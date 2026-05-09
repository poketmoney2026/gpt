"use client";

import { useEffect, useMemo, useState } from "react";

const useCases = ["Coding", "Analysis", "Study", "Writing", "Research", "Graphics", "Business", "Marketing", "Translation", "Data", "Office", "Other"];
const deviceBrands = [
  "iPhone", "Samsung", "Xiaomi", "Redmi", "POCO", "Realme", "Vivo", "Oppo", "OnePlus", "Huawei", "Honor", "Infinix", "Tecno", "Itel", "Nokia", "Motorola", "Google Pixel", "Sony", "LG", "Asus", "Lenovo", "ZTE", "HTC", "Meizu", "Nothing", "Walton", "Symphony", "Lava", "Micromax", "Other",
];

const emptyForm = {
  customerName: "",
  orderMobile: "",
  email: "",
  device: "iPhone",
  plan: "share",
  days: 1,
  useCases: [],
};

function mobileOnly(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" });
}

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCountdown(endDate) {
  if (!endDate) return "-";
  const ms = new Date(endDate).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function localMobileError(value) {
  const raw = String(value || "").trim();
  const mobile = mobileOnly(raw);
  if (!raw) return "মোবাইল নাম্বার দিন।";
  if (!mobile.startsWith("0")) return "আপনার ১১ সংখ্যার নাম্বারটি দিন।";
  if (!mobile.startsWith("01")) return "নাম্বারটি 01 দিয়ে শুরু হতে হবে।";
  if (mobile.length !== 11) return "আপনার ১১ সংখ্যার নাম্বারটি দিন।";
  return "";
}

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState("");
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({ planPrices: { share: 6, personal: 9 } });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [, setTick] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const pricePerDay = Number(settings?.planPrices?.[form.plan] || (form.plan === "personal" ? 9 : 6));
  const amount = Math.round(pricePerDay * Number(form.days || 1) * 100) / 100;
  const rangePercent = ((Number(form.days || 1) - 1) / 29) * 100;
  const canSave =
    form.customerName.trim().length > 1 &&
    form.orderMobile.length === 11 &&
    form.email.includes("@") &&
    form.device &&
    form.useCases.length > 0 &&
    !saving;

  const summary = useMemo(() => {
    const verified = orders.filter((item) => item.verifyStatus === "verified").length;
    const unpaid = orders.filter((item) => item.paymentStatus === "unpaid").length;
    return {
      orders: orders.length,
      amount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      verified,
      unpaid,
    };
  }, [orders]);

  function notify(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
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
        if (data.settings) setSettings(data.settings);
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

    const localError = localMobileError(mobile);
    if (localError) {
      setLoginError(localError);
      notify(localError);
      return;
    }

    setLoginError("");
    setLoginLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileOnly(mobile) }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        const errorText = data.message || "লগইন করা যায়নি।";
        setLoginError(errorText);
        notify(errorText);
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
    setEditingId(null);
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleUseCase(item) {
    setForm((prev) => {
      if (prev.useCases.includes(item)) {
        return { ...prev, useCases: prev.useCases.filter((value) => value !== item) };
      }
      return { ...prev, useCases: [...prev.useCases, item] };
    });
  }

  function newOrder() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function editOrder(order) {
    if (order.verifyStatus === "verified") {
      notify("Verified order edit করা যাবে না।");
      return;
    }
    setEditingId(order.id);
    setForm({
      customerName: order.customerName || "",
      orderMobile: order.orderMobile || "",
      email: order.email || "",
      device: order.device || "iPhone",
      plan: order.plan || "share",
      days: Number(order.days || 1),
      useCases: Array.isArray(order.useCases) ? order.useCases : [],
    });
    setOpen(true);
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
      const url = editingId ? `/api/orders/${editingId}` : "/api/orders";
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        notify(data.message || "Order save failed");
        return;
      }

      if (editingId) {
        setOrders((prev) => prev.map((item) => (item.id === editingId ? data.order : item)));
        notify("Order updated successfully");
      } else {
        setOrders((prev) => [data.order, ...prev]);
        notify("Order saved successfully");
      }

      if (data.settings) setSettings(data.settings);
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
    } catch {
      notify("Server connection failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order) {
    if (order.verifyStatus === "verified") {
      notify("Verified order delete করা যাবে না।");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        notify(data.message || "Delete failed");
        return;
      }
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      notify("Order deleted");
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
            {loginError && <div className="mt-4 border border-red-300/60 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{loginError}</div>}
            <div className="mt-5 space-y-2">
              <input
                value={mobile}
                onChange={(event) => {
                  setMobile(mobileOnly(event.target.value));
                  setLoginError("");
                }}
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
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 md:py-7">
        <header className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/75">GPT Customer Data Center</p>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">User Panel</h1>
            <p className="mt-1 text-xs text-emerald-100/65">{user.mobile}</p>
          </div>
          <div className="flex gap-2">
            {user.role === "admin" && <a href="/admin" className="ghost-btn px-4 py-2 text-xs font-bold text-cyan-100">Admin</a>}
            <button onClick={logout} className="ghost-btn px-4 py-2 text-xs font-bold">Logout</button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Orders" value={summary.orders} />
          <Stat title="Amount" value={`৳${summary.amount}`} />
          <Stat title="Verified" value={summary.verified} />
          <Stat title="Unpaid" value={summary.unpaid} />
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
              <table className="w-full min-w-[1360px] text-left text-xs">
                <thead className="bg-emerald-300/10 text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                  <tr>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Mobile</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Device</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Days</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Use Case</th>
                    <th className="px-3 py-3">Left Countdown</th>
                    <th className="px-3 py-3">Added Time</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Verified</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="px-3 py-12 text-center">
                        <div className="mx-auto w-fit border border-emerald-300/35 bg-white/[0.06] px-8 py-5 text-2xl font-black text-emerald-100/55">0</div>
                      </td>
                    </tr>
                  ) : orders.map((order) => {
                    const locked = order.verifyStatus === "verified";
                    return (
                      <tr key={order.id} className="border-t border-emerald-300/20 text-emerald-50/90 transition hover:bg-emerald-300/5">
                        <td className="px-3 py-3 font-bold text-white">{order.customerName}</td>
                        <td className="px-3 py-3">{order.orderMobile}</td>
                        <td className="px-3 py-3">{order.email}</td>
                        <td className="px-3 py-3">{order.device}</td>
                        <td className="px-3 py-3 capitalize"><Badge>{order.plan}</Badge></td>
                        <td className="px-3 py-3">{order.runningDays}/{order.days}</td>
                        <td className="px-3 py-3 font-bold text-emerald-100">৳{order.amount}</td>
                        <td className="px-3 py-3">{order.useCases?.join(", ")}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-cyan-100">{formatCountdown(order.endDate)}</td>
                        <td className="px-3 py-3">{formatTime(order.createdAt)}</td>
                        <td className="px-3 py-3 capitalize"><Badge>{order.paymentStatus || "unpaid"}</Badge></td>
                        <td className="px-3 py-3 capitalize"><Badge>{order.verifyStatus || "unverified"}</Badge></td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button disabled={locked || saving} onClick={() => editOrder(order)} className="ghost-btn px-3 py-1.5 text-[10px] font-bold disabled:opacity-35">Edit</button>
                            <button disabled={locked || saving} onClick={() => deleteOrder(order)} className="ghost-btn px-3 py-1.5 text-[10px] font-bold disabled:opacity-35">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <button onClick={newOrder} className="primary-btn fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black shadow-[0_0_36px_rgba(45,212,191,0.45)]" aria-label="Add order">+</button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={saveOrder} className="glass-card mini-scroll max-h-[92vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-200/75">{editingId ? "Edit Order" : "New Order"}</p>
                <h2 className="mt-1 text-2xl font-black text-white">Customer Data</h2>
              </div>
              <button type="button" onClick={() => { setOpen(false); setEditingId(null); setForm(emptyForm); }} className="ghost-btn px-3 py-2 text-xs font-bold">Close</button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input value={form.customerName} onChange={(value) => updateForm("customerName", value)} placeholder="ইউজারের নাম" />
              <Input value={form.orderMobile} onChange={(value) => updateForm("orderMobile", mobileOnly(value))} placeholder="মোবাইল নাম্বার" />
              <Input value={form.email} onChange={(value) => updateForm("email", value)} placeholder="ইমেইল" type="email" />
              <Select value={form.device} onChange={(value) => updateForm("device", value)} options={deviceBrands.map((item) => [item, item])} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="soft-panel p-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/60">Plan</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["share", "personal"].map((plan) => (
                    <button key={plan} type="button" onClick={() => updateForm("plan", plan)} className={`border px-3 py-3 text-left transition ${form.plan === plan ? "border-emerald-200 bg-emerald-300/18 text-white" : "border-emerald-300/25 bg-white/[0.04] text-emerald-100/65"}`}>
                      <span className="block text-sm font-black capitalize">{plan}</span>
                      <span className="mt-1 block text-xs">৳{settings?.planPrices?.[plan] || (plan === "personal" ? 9 : 6)} / day</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="soft-panel p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/60">Duration</p>
                  <p className="text-xs font-bold text-white">{form.days} days</p>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={form.days}
                  onChange={(event) => updateForm("days", Number(event.target.value))}
                  className="mt-4"
                  style={{ background: `linear-gradient(90deg, rgba(110,231,183,0.75) ${rangePercent}%, rgba(255,255,255,0.13) ${rangePercent}%)` }}
                />
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="border border-emerald-300/25 bg-white/[0.04] p-3">
                    <p className="text-emerald-100/55">Per Day</p>
                    <p className="text-lg font-black text-white">৳{pricePerDay}</p>
                  </div>
                  <div className="border border-emerald-300/25 bg-white/[0.04] p-3">
                    <p className="text-emerald-100/55">Amount</p>
                    <p className="text-lg font-black text-white">৳{amount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 soft-panel p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/60">Use Case</p>
                <p className="text-[10px] text-emerald-100/55">Selected: {form.useCases.length}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4">
                {useCases.map((item) => {
                  const selected = form.useCases.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleUseCase(item)}
                      className={`min-h-12 border px-2 text-center text-[11px] font-bold transition ${selected ? "border-emerald-200 bg-emerald-300/18 text-white" : "border-emerald-300/25 bg-white/[0.04] text-emerald-100/65"}`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <button disabled={!canSave} className="primary-btn mt-4 h-12 w-full text-xs font-black uppercase tracking-[0.28em]">
              {saving ? "Saving" : editingId ? "Update Order" : "Order"}
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
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm p-6 text-center">
        <div className="loader-ring mx-auto rounded-full" />
        <h1 className="mt-4 text-xl font-black text-white">{title}</h1>
        <p className="mt-1 text-xs text-emerald-100/60">{text}<span className="animate-pulse">...</span></p>
      </div>
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

function Input({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="form-input" />;
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="form-input bg-[#0c1a2a]">
      {options.map(([valueOption, label]) => <option key={valueOption || label} value={valueOption}>{label}</option>)}
    </select>
  );
}

function TableLoading({ rows = 4 }) {
  return (
    <div className="p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="mb-2 grid grid-cols-4 gap-2 md:grid-cols-8">
          {Array.from({ length: 8 }).map((__, cell) => <div key={cell} className="shimmer-box h-8 border border-emerald-300/15" />)}
        </div>
      ))}
    </div>
  );
}

function Toast({ text }) {
  return <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-emerald-300/60 bg-emerald-950/90 px-4 py-2 text-[11px] font-bold text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.35)]">{text}</div>;
}

function Badge({ children }) {
  return <span className="border border-emerald-300/45 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold text-emerald-100">{children}</span>;
}
