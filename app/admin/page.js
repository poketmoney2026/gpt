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
    setTimeout(() => setMessage(""), 2200);
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function loadOrders(currentFilters) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();

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
    <main className="min-h-screen bg-[#06111f] px-4 py-5 text-white">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-emerald-300/40 bg-white/[0.07] p-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/75">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-black text-white">All Orders</h1>
          </div>
          <a href="/" className="border border-emerald-300/45 px-4 py-2 text-xs font-bold text-emerald-100">User Panel</a>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat title="Orders" value={summary.orders} />
          <Stat title="Amount" value={`৳${summary.amount}`} />
          <Stat title="Pending" value={summary.pending} />
          <Stat title="Active" value={summary.active} />
        </section>

        <form onSubmit={submitFilter} className="mt-4 border border-emerald-300/40 bg-white/[0.07] p-3 backdrop-blur-xl">
          <div className="grid gap-2 md:grid-cols-6">
            <Input value={filters.search} onChange={(value) => updateFilter("search", value)} placeholder="Search" />
            <Select value={filters.plan} onChange={(value) => updateFilter("plan", value)} options={["", "share", "personal"]} />
            <Select value={filters.status} onChange={(value) => updateFilter("status", value)} options={["", "pending", "active", "completed", "cancelled"]} />
            <Select value={filters.useCase} onChange={(value) => updateFilter("useCase", value)} options={useCases} />
            <Input value={filters.minDays} onChange={(value) => updateFilter("minDays", value.replace(/\D/g, ""))} placeholder="Min days" />
            <Input value={filters.maxDays} onChange={(value) => updateFilter("maxDays", value.replace(/\D/g, ""))} placeholder="Max days" />
            <Input value={filters.minAmount} onChange={(value) => updateFilter("minAmount", value.replace(/\D/g, ""))} placeholder="Min amount" />
            <Input value={filters.maxAmount} onChange={(value) => updateFilter("maxAmount", value.replace(/\D/g, ""))} placeholder="Max amount" />
            <Input type="date" value={filters.from} onChange={(value) => updateFilter("from", value)} placeholder="From" />
            <Input type="date" value={filters.to} onChange={(value) => updateFilter("to", value)} placeholder="To" />
            <Select value={filters.sort} onChange={(value) => updateFilter("sort", value)} options={["newest", "amountHigh", "amountLow", "daysHigh", "daysLow"]} />
            <div className="grid grid-cols-2 gap-2">
              <button className="border border-emerald-200 bg-emerald-300/25 text-xs font-bold text-emerald-50">Filter</button>
              <button type="button" onClick={clearFilter} className="border border-emerald-300/45 text-xs font-bold text-emerald-100">Clear</button>
            </div>
          </div>
        </form>

        <section className="mt-4 overflow-hidden border border-emerald-300/40 bg-white/[0.07] backdrop-blur-xl">
          <div className="border-b border-emerald-300/30 p-3 text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">
            {loading ? "Loading" : `Result: ${orders.length}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-emerald-300/10 text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                <tr>
                  <th className="px-3 py-3">Owner</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Mobile</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Days</th>
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
                  <tr><td colSpan="12" className="px-3 py-10 text-center text-emerald-100/50">0</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="border-t border-emerald-300/20 text-emerald-50/90">
                    <td className="px-3 py-3">{order.ownerMobile}</td>
                    <td className="px-3 py-3 font-bold text-white">{order.customerName}</td>
                    <td className="px-3 py-3">{order.orderMobile}</td>
                    <td className="px-3 py-3">{order.email}</td>
                    <td className="px-3 py-3 capitalize">{order.plan}</td>
                    <td className="px-3 py-3">{order.days}</td>
                    <td className="px-3 py-3">{order.runningDays}</td>
                    <td className="px-3 py-3">{order.remainingDays}</td>
                    <td className="px-3 py-3">৳{order.amount}</td>
                    <td className="px-3 py-3">{order.useCases?.join(", ")}</td>
                    <td className="px-3 py-3 capitalize">{order.status}</td>
                    <td className="px-3 py-3">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      {message && <Toast text={message} />}
    </main>
  );
}

function Stat({ title, value }) {
  return <div className="border border-emerald-300/40 bg-white/[0.07] p-3 backdrop-blur-xl"><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/60">{title}</p><h2 className="mt-1 text-2xl font-black text-white">{value}</h2></div>;
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-xs text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-200" />;
}

function Select({ value, onChange, options }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border border-emerald-300/45 bg-[#0c1a2a] px-3 text-xs text-white outline-none focus:border-emerald-200">{options.map((item) => <option key={item || "all"} value={item}>{item || "All"}</option>)}</select>;
}

function Toast({ text }) {
  return <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-emerald-300/45 bg-slate-950/90 px-4 py-2 text-xs font-bold text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.25)]">{text}</div>;
}
