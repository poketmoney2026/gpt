"use client";

import { useEffect, useMemo, useState } from "react";

const useCases = ["Coding", "Analysis", "Study", "Writing", "Research", "Graphics", "Business", "Marketing", "Translation", "Data", "Office", "Other"];
const deviceBrands = [
  "iPhone", "Samsung", "Xiaomi", "Redmi", "POCO", "Realme", "Vivo", "Oppo", "OnePlus", "Huawei", "Honor", "Infinix", "Tecno", "Itel", "Nokia", "Motorola", "Google Pixel", "Sony", "LG", "Asus", "Lenovo", "ZTE", "HTC", "Meizu", "Nothing", "Walton", "Symphony", "Lava", "Micromax", "Other",
];

const defaultFilters = {
  search: "",
  plan: "",
  status: "",
  paymentStatus: "",
  verifyStatus: "",
  device: "",
  useCase: "",
  minDays: "",
  maxDays: "",
  minAmount: "",
  maxAmount: "",
  from: "",
  to: "",
  sort: "newest",
};

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

function buildQuery(filters, scope = "filtered") {
  const params = new URLSearchParams();
  params.set("scope", scope);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) params.set(key, value);
  });
  return params.toString();
}

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({ planPrices: { share: 6, personal: 9 } });
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    loadOrders(filters);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const visibleSummary = useMemo(() => ({
    count: orders.length,
    amount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    paid: orders.filter((item) => item.paymentStatus === "paid").length,
    verified: orders.filter((item) => item.verifyStatus === "verified").length,
  }), [orders]);

  function notify(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  }

  async function loadOrders(nextFilters = filters) {
    setLoading(true);
    setAccessDenied(false);
    try {
      const response = await fetch(`/api/admin/orders?${buildQuery(nextFilters)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setAccessDenied(response.status === 403 || response.status === 401);
        notify(data.message || "Admin data load failed");
        return;
      }
      setOrders(data.orders || []);
      setStats(data.stats || null);
      if (data.settings) setSettings(data.settings);
    } catch {
      notify("Server connection failed");
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function updateOrder(orderId, patch) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        notify(data.message || "Status update failed");
        return;
      }
      setOrders((prev) => prev.map((item) => (item.id === orderId ? data.order : item)));
      await loadOrders(filters);
      notify("Status updated");
    } catch {
      notify("Server connection failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        notify(data.message || "Settings save failed");
        return;
      }
      setSettings(data.settings);
      notify("Plan price updated");
    } catch {
      notify("Server connection failed");
    } finally {
      setSaving(false);
    }
  }

  function download(scope) {
    window.location.href = `/api/admin/export?${buildQuery(filters, scope)}`;
  }

  if (accessDenied) {
    return (
      <Shell>
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center px-4">
          <div className="glass-card w-full p-6 text-center">
            <h1 className="text-2xl font-black text-white">Admin Access Required</h1>
            <p className="mt-2 text-sm text-emerald-100/60">Admin mobile দিয়ে login করুন।</p>
            <a href="/" className="primary-btn mt-5 inline-flex px-5 py-3 text-xs font-black uppercase tracking-[0.25em]">Go Login</a>
          </div>
        </div>
        {message && <Toast text={message} />}
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 py-5 md:py-7">
        <header className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/75">Admin Control Center</p>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Orders & Income Dashboard</h1>
            <p className="mt-1 text-xs text-emerald-100/65">Filter, verify, payment update, price setting and Excel export</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="ghost-btn px-4 py-2 text-xs font-bold">User Panel</a>
            <button onClick={() => loadOrders(filters)} className="ghost-btn px-4 py-2 text-xs font-bold">Refresh</button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat title="Today Income" value={`৳${stats?.todayIncome || 0}`} />
          <Stat title="Yesterday Income" value={`৳${stats?.yesterdayIncome || 0}`} />
          <Stat title="Total Users" value={stats?.totalUsers || 0} />
          <Stat title="New Users Today" value={stats?.newUsersToday || 0} />
          <Stat title="Today Orders" value={stats?.todayOrders || 0} />
          <Stat title="Today Amount" value={`৳${stats?.todayOrderAmount || 0}`} />
          <Stat title="Total Paid" value={`৳${stats?.totalPaidAmount || 0}`} />
          <Stat title="Total Unpaid" value={`৳${stats?.totalUnpaidAmount || 0}`} />
          <Stat title="Verified" value={stats?.verifiedOrders || 0} />
          <Stat title="Unverified" value={stats?.unverifiedOrders || 0} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">Filters</h2>
                <p className="mt-1 text-[10px] text-emerald-100/55">সব ডাটা ফিল্টার করে বের করুন</p>
              </div>
              <button onClick={() => { setFilters(defaultFilters); loadOrders(defaultFilters); }} className="ghost-btn px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Reset</button>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-4 xl:grid-cols-6">
              <Input value={filters.search} onChange={(value) => updateFilter("search", value)} placeholder="Search" />
              <Select value={filters.plan} onChange={(value) => updateFilter("plan", value)} options={[["", "All Plan"], ["share", "Share"], ["personal", "Personal"]]} />
              <Select value={filters.paymentStatus} onChange={(value) => updateFilter("paymentStatus", value)} options={[["", "All Payment"], ["unpaid", "Unpaid"], ["paid", "Paid"]]} />
              <Select value={filters.verifyStatus} onChange={(value) => updateFilter("verifyStatus", value)} options={[["", "All Verify"], ["unverified", "Unverified"], ["verified", "Verified"]]} />
              <Select value={filters.status} onChange={(value) => updateFilter("status", value)} options={[["", "All Status"], ["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]]} />
              <Select value={filters.device} onChange={(value) => updateFilter("device", value)} options={[["", "All Device"], ...deviceBrands.map((item) => [item, item])]} />
              <Select value={filters.useCase} onChange={(value) => updateFilter("useCase", value)} options={[["", "All Use Case"], ...useCases.map((item) => [item, item])]} />
              <Input value={filters.minDays} onChange={(value) => updateFilter("minDays", value)} placeholder="Min Days" type="number" />
              <Input value={filters.maxDays} onChange={(value) => updateFilter("maxDays", value)} placeholder="Max Days" type="number" />
              <Input value={filters.minAmount} onChange={(value) => updateFilter("minAmount", value)} placeholder="Min Amount" type="number" />
              <Input value={filters.maxAmount} onChange={(value) => updateFilter("maxAmount", value)} placeholder="Max Amount" type="number" />
              <Select value={filters.sort} onChange={(value) => updateFilter("sort", value)} options={[["newest", "Newest"], ["oldest", "Oldest"], ["amountHigh", "Amount High"], ["amountLow", "Amount Low"], ["daysHigh", "Days High"], ["daysLow", "Days Low"]]} />
              <Input value={filters.from} onChange={(value) => updateFilter("from", value)} placeholder="From" type="date" />
              <Input value={filters.to} onChange={(value) => updateFilter("to", value)} placeholder="To" type="date" />
              <button onClick={() => loadOrders(filters)} className="primary-btn h-10 text-[10px] font-black uppercase tracking-[0.24em] md:col-span-2 xl:col-span-2">Apply Filter</button>
            </div>
          </div>

          <form onSubmit={saveSettings} className="glass-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">Plan Price</h2>
            <p className="mt-1 text-[10px] text-emerald-100/55">Admin চাইলে rate change করতে পারবে</p>
            <div className="mt-4 space-y-2">
              <Input value={settings?.planPrices?.share ?? 6} onChange={(value) => setSettings((prev) => ({ ...prev, planPrices: { ...prev.planPrices, share: value } }))} placeholder="Share price/day" type="number" />
              <Input value={settings?.planPrices?.personal ?? 9} onChange={(value) => setSettings((prev) => ({ ...prev, planPrices: { ...prev.planPrices, personal: value } }))} placeholder="Personal price/day" type="number" />
              <button disabled={saving} className="primary-btn h-10 w-full text-[10px] font-black uppercase tracking-[0.24em]">Save Price</button>
            </div>
          </form>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Filtered Orders" value={visibleSummary.count} />
          <Stat title="Filtered Amount" value={`৳${visibleSummary.amount}`} />
          <Stat title="Filtered Paid" value={visibleSummary.paid} />
          <Stat title="Filtered Verified" value={visibleSummary.verified} />
        </section>

        <section className="glass-card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-300/30 p-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">Admin Orders Table</h2>
              <p className="mt-1 text-[10px] text-emerald-100/55">Status, payment, verified control</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => download("filtered")} className="ghost-btn px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Download Filtered</button>
              <button onClick={() => download("today")} className="ghost-btn px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Download Today</button>
              <button onClick={() => download("all")} className="ghost-btn px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Download All</button>
            </div>
          </div>

          {loading ? (
            <TableLoading rows={7} />
          ) : (
            <div className="mini-scroll overflow-x-auto">
              <table className="w-full min-w-[1760px] text-left text-xs">
                <thead className="bg-emerald-300/10 text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                  <tr>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Mobile</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Device</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Days</th>
                    <th className="px-3 py-3">Running</th>
                    <th className="px-3 py-3">Left</th>
                    <th className="px-3 py-3">Countdown</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Use Case</th>
                    <th className="px-3 py-3">Added Time</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Verify</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="16" className="px-3 py-12 text-center">
                        <div className="mx-auto w-fit border border-emerald-300/35 bg-white/[0.06] px-8 py-5 text-2xl font-black text-emerald-100/55">0</div>
                      </td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr key={order.id} className="border-t border-emerald-300/20 text-emerald-50/90 transition hover:bg-emerald-300/5">
                      <td className="px-3 py-3">{order.ownerMobile || "-"}</td>
                      <td className="px-3 py-3 font-bold text-white">{order.customerName}</td>
                      <td className="px-3 py-3">{order.orderMobile}</td>
                      <td className="px-3 py-3">{order.email}</td>
                      <td className="px-3 py-3">{order.device}</td>
                      <td className="px-3 py-3 capitalize"><Badge>{order.plan}</Badge></td>
                      <td className="px-3 py-3">{order.days}</td>
                      <td className="px-3 py-3">{order.runningDays}</td>
                      <td className="px-3 py-3">{order.remainingDays}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-cyan-100">{formatCountdown(order.endDate)}</td>
                      <td className="px-3 py-3 font-bold text-emerald-100">৳{order.amount}</td>
                      <td className="px-3 py-3">{order.useCases?.join(", ")}</td>
                      <td className="px-3 py-3">{formatTime(order.createdAt)}</td>
                      <td className="px-3 py-3">
                        <Select value={order.paymentStatus || "unpaid"} onChange={(value) => updateOrder(order.id, { paymentStatus: value })} options={[["unpaid", "Unpaid"], ["paid", "Paid"]]} small />
                      </td>
                      <td className="px-3 py-3">
                        <Select value={order.verifyStatus || "unverified"} onChange={(value) => updateOrder(order.id, { verifyStatus: value })} options={[["unverified", "Unverified"], ["verified", "Verified"]]} small />
                      </td>
                      <td className="px-3 py-3">
                        <Select value={order.status || "pending"} onChange={(value) => updateOrder(order.id, { status: value })} options={[["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]]} small />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
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

function Select({ value, onChange, options, small = false }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`form-input bg-[#0c1a2a] ${small ? "h-8 min-w-[118px] text-[11px]" : ""}`}>
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
