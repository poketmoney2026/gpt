"use client";

import React, { useEffect, useMemo, useState } from "react";

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

const defaultFilters = {
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

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" });
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const summary = useMemo(() => {
    return {
      orders: orders.length,
      amount: orders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
      pending: orders.filter((order) => order.status === "pending").length,
      active: orders.filter((order) => order.status === "active").length,
    };
  }, [orders]);

  useEffect(() => {
    loadMeAndOrders();
  }, []);

  async function loadMeAndOrders() {
    setLoading(true);
    try {
      const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meResponse.ok) {
        setMessage("Please login first");
        setLoading(false);
        return;
      }
      const me = await meResponse.json();
      setUser(me.user);
      await loadOrders(filters);
    } catch {
      setMessage("Server connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders(currentFilters = filters) {
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessage(data.message || "Orders load failed");
      setOrders([]);
      return;
    }

    setMessage("");
    setOrders(data.orders || []);
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFilter(event) {
    event.preventDefault();
    setLoading(true);
    await loadOrders(filters);
    setLoading(false);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    loadOrders(defaultFilters);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&display=swap");

        body {
          font-family: "Oxanium", sans-serif;
          background: #06111f;
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

      <section className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 py-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-emerald-300/40 bg-gradient-to-br from-cyan-950/55 via-emerald-950/45 to-slate-900/60 p-3 shadow-[0_0_45px_rgba(16,185,129,0.18)] backdrop-blur-2xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/80">Admin Panel</p>
            <h1 className="mt-1 text-xl font-bold text-emerald-100">Orders</h1>
          </div>
          <a href="/" className="border border-emerald-300/45 bg-white/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-300/15">
            User Panel
          </a>
        </header>

        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-4 h-12 w-12 border-2 border-emerald-300/20 border-t-emerald-300" style={{ animation: "spinGlow 0.8s linear infinite" }} />
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Loading</p>
          </div>
        ) : message ? (
          <div className="border border-red-300/40 bg-red-950/35 p-4 text-sm text-red-100">
            {message}
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat title="Orders" value={summary.orders} />
              <Stat title="Amount" value={`৳${summary.amount}`} />
              <Stat title="Pending" value={summary.pending} />
              <Stat title="Active" value={summary.active} />
            </div>

            <form onSubmit={handleFilter} className="mb-4 border border-emerald-300/40 bg-gradient-to-br from-cyan-950/45 via-emerald-950/35 to-slate-900/55 p-3 shadow-[0_0_45px_rgba(16,185,129,0.14)] backdrop-blur-2xl">
              <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-6">
                <Field placeholder="Search" value={filters.search} onChange={(value) => updateFilter("search", value)} />
                <Select value={filters.plan} onChange={(value) => updateFilter("plan", value)} options={["", "share", "personal"]} label="Plan" />
                <Select value={filters.status} onChange={(value) => updateFilter("status", value)} options={["", "pending", "active", "completed", "cancelled"]} label="Status" />
                <Select value={filters.useCase} onChange={(value) => updateFilter("useCase", value)} options={useCases} label="Use Case" />
                <Field placeholder="Min Days" type="number" value={filters.minDays} onChange={(value) => updateFilter("minDays", value)} />
                <Field placeholder="Max Days" type="number" value={filters.maxDays} onChange={(value) => updateFilter("maxDays", value)} />
                <Field placeholder="Min Amount" type="number" value={filters.minAmount} onChange={(value) => updateFilter("minAmount", value)} />
                <Field placeholder="Max Amount" type="number" value={filters.maxAmount} onChange={(value) => updateFilter("maxAmount", value)} />
                <Field type="date" value={filters.from} onChange={(value) => updateFilter("from", value)} />
                <Field type="date" value={filters.to} onChange={(value) => updateFilter("to", value)} />
                <Select value={filters.sort} onChange={(value) => updateFilter("sort", value)} options={["newest", "amountHigh", "amountLow", "daysHigh", "daysLow"]} label="Sort" />
                <div className="grid grid-cols-2 gap-2">
                  <button type="submit" className="h-9 border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-950 hover:brightness-110">
                    Filter
                  </button>
                  <button type="button" onClick={clearFilters} className="h-9 border border-emerald-300/45 bg-white/[0.08] text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-300/15">
                    Clear
                  </button>
                </div>
              </div>
            </form>

            <div className="overflow-hidden border border-emerald-300/40 bg-gradient-to-br from-cyan-950/45 via-emerald-950/35 to-slate-900/55 shadow-[0_0_45px_rgba(16,185,129,0.14)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-emerald-300/25 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">All Orders</p>
                <p className="text-[10px] text-cyan-100/65">{orders.length} Records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-[11px]">
                  <thead className="bg-white/[0.06] text-emerald-100/80">
                    <tr>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Mobile</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Plan</th>
                      <th className="px-3 py-2 font-medium">Days</th>
                      <th className="px-3 py-2 font-medium">Running</th>
                      <th className="px-3 py-2 font-medium">Remaining</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Use Cases</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="px-3 py-8 text-center text-emerald-100/50">0 Orders</td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-t border-emerald-300/15 text-emerald-50/90">
                          <td className="px-3 py-2">{order.ownerMobile || "-"}</td>
                          <td className="px-3 py-2">{order.customerName}</td>
                          <td className="px-3 py-2">{order.orderMobile}</td>
                          <td className="px-3 py-2">{order.email}</td>
                          <td className="px-3 py-2 capitalize">{order.plan}</td>
                          <td className="px-3 py-2">{order.days}</td>
                          <td className="px-3 py-2">{order.runningDays}</td>
                          <td className="px-3 py-2">{order.remainingDays}</td>
                          <td className="px-3 py-2">৳{order.amount}</td>
                          <td className="px-3 py-2">{order.useCases?.join(", ")}</td>
                          <td className="px-3 py-2 capitalize">{order.status}</td>
                          <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
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

function Field({ value, onChange, placeholder = "", type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
    />
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full border border-emerald-300/45 bg-slate-950/80 px-3 text-[11px] text-white outline-none transition focus:border-emerald-300"
    >
      {options.map((option) => (
        <option key={option || label} value={option}>
          {option ? option : label}
        </option>
      ))}
    </select>
  );
}
