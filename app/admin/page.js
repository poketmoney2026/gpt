"use client";

import { useEffect, useMemo, useState } from "react";

const useCases = [
  "",
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

const emptyFilters = {
  search: "",
  plan: "",
  status: "",
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

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");

  const summary = useMemo(() => ({
    orders: orders.length,
    amount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    pending: orders.filter((item) => item.status === "pending").length,
    active: orders.filter((item) => item.status === "active").length,
  }), [orders]);

  useEffect(() => {
    loadOrders(emptyFilters);
  }, []);

  function notify(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2300);
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function loadOrders(currentFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        notify(data.message || "Admin load failed");
        setOrders([]);
        return;
      }

      setOrders(data.orders || []);
    } catch {
      notify("Server connection failed");
    } finally {
      setLoading(false);
    }
  }

  function submitFilter(event) {
    event.preventDefault();
    loadOrders(filters);
  }

  function clearFilter() {
    setFilters(emptyFilters);
    loadOrders(emptyFilters);
  }

  return (
    <Shell>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 md:py-7">
        <header className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/75">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">All Orders</h1>
            <p className="mt-1 text-xs text-emerald-100/65">Filter, check and monitor package orders</p>
          </div>
          <a href="/" className="ghost-btn px-4 py-2 text-xs font-bold text-emerald-100">User Panel</a>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Orders" value={summary.orders} />
          <Stat title="Amount" value={`৳${summary.amount}`} />
          <Stat title="Pending" value={summary.pending} />
          <Stat title="Active" value={summary.active} />
        </section>

        <form onSubmit={submitFilter} className="glass-card mt-4 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-100/70">Filters</p>
            <span className="text-[10px] text-cyan-100/60">Result: {orders.length}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            <Input value={filters.search} onChange={(value) => updateFilter("search", value)} placeholder="Search" />
            <Select value={filters.plan} onChange={(value) => updateFilter("plan", value)} options={[["", "All Plan"], ["share", "Share"], ["personal", "Personal"]]} />
            <Select value={filters.status} onChange={(value) => updateFilter("status", value)} options={[["", "All Status"], ["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]]} />
            <Select value={filters.useCase} onChange={(value) => updateFilter("useCase", value)} options={useCases.map((item) => [item, item || "All Use Case"])} />
            <Input value={filters.minDays} onChange={(value) => updateFilter("minDays", value.replace(/\D/g, ""))} placeholder="Min days" />
            <Input value={filters.maxDays} onChange={(value) => updateFilter("maxDays", value.replace(/\D/g, ""))} placeholder="Max days" />
            <Input value={filters.minAmount} onChange={(value) => updateFilter("minAmount", value.replace(/\D/g, ""))} placeholder="Min amount" />
            <Input value={filters.maxAmount} onChange={(value) => updateFilter("maxAmount", value.replace(/\D/g, ""))} placeholder="Max amount" />
            <Input type="date" value={filters.from} onChange={(value) => updateFilter("from", value)} placeholder="From" />
            <Input type="date" value={filters.to} onChange={(value) => updateFilter("to", value)} placeholder="To" />
            <Select value={filters.sort} onChange={(value) => updateFilter("sort", value)} options={[["newest", "Newest"], ["oldest", "Oldest"], ["amountHigh", "Amount High"], ["amountLow", "Amount Low"], ["daysHigh", "Days High"], ["daysLow", "Days Low"]]} />
            <div className="grid grid-cols-2 gap-2">
              <button className="primary-btn text-xs font-bold uppercase tracking-[0.18em]">Filter</button>
              <button type="button" onClick={clearFilter} className="ghost-btn text-xs font-bold uppercase tracking-[0.18em]">Clear</button>
            </div>
          </div>
        </form>

        <section className="glass-card mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-emerald-300/30 p-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">Order Database</p>
              <p className="mt-1 text-[10px] text-emerald-100/55">Admin live table</p>
            </div>
            <button onClick={() => loadOrders(filters)} className="ghost-btn px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Refresh</button>
          </div>

          {loading ? (
            <TableLoading rows={6} />
          ) : (
            <div className="mini-scroll overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-xs">
                <thead className="bg-emerald-300/10 text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                  <tr>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Mobile</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Total Days</th>
                    <th className="px-3 py-3">Running</th>
                    <th className="px-3 py-3">Left</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Use Case</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="px-3 py-12 text-center">
                        <div className="mx-auto w-fit border border-emerald-300/35 bg-white/[0.06] px-8 py-5 text-2xl font-black text-emerald-100/55">0</div>
                      </td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr key={order.id} className="border-t border-emerald-300/20 text-emerald-50/90 transition hover:bg-emerald-300/5">
                      <td className="px-3 py-3">{order.ownerMobile || "-"}</td>
                      <td className="px-3 py-3 font-bold text-white">{order.customerName}</td>
                      <td className="px-3 py-3">{order.orderMobile}</td>
                      <td className="px-3 py-3">{order.email}</td>
                      <td className="px-3 py-3 capitalize"><Badge>{order.plan}</Badge></td>
                      <td className="px-3 py-3">{order.days}</td>
                      <td className="px-3 py-3">{order.runningDays}</td>
                      <td className="px-3 py-3">{order.remainingDays}</td>
                      <td className="px-3 py-3 font-bold text-emerald-100">৳{order.amount}</td>
                      <td className="px-3 py-3">{order.useCases?.join(", ")}</td>
                      <td className="px-3 py-3 capitalize"><Badge>{order.status}</Badge></td>
                      <td className="px-3 py-3">{formatDate(order.createdAt)}</td>
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
