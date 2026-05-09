"use client";

import React, { useEffect, useMemo, useState } from "react";

const uses = [
  "Code X",
  "Image",
  "Study",
  "Analysis",
  "Writing",
  "Business",
  "Research",
  "Other",
];

const SESSION_KEY = "gpt_crm_session";
const mobileRegex = /^01\d{9}$/;

const emptyForm = {
  name: "",
  number: "",
  email: "",
  deviceName: "",
  note: "",
};

const priceByPlan = {
  share: 5,
  personal: 8,
};

const statusLabel = {
  active: "Active",
  "ending-soon": "Ending Soon",
  expired: "Expired",
};

const reviewTypeLabel = {
  edit: "Edit Request",
  delete: "Delete Request",
};

const getStoredSession = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.token || new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const authHeader = () => {
  const session = getStoredSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
};

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
};

const formatTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  });
};

const money = (amount) => `৳${Number(amount || 0).toLocaleString("en-BD")}`;

export default function Page() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [loginNumber, setLoginNumber] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({ editMode: "review", deleteMode: "review" });
  const [formData, setFormData] = useState(emptyForm);
  const [selectedUses, setSelectedUses] = useState([]);
  const [days, setDays] = useState(7);
  const [planType, setPlanType] = useState("share");
  const [editingPackage, setEditingPackage] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "all", plan: "all", maxLeft: "" });
  const [activeAdminTab, setActiveAdminTab] = useState("packages");

  const pricePerDay = priceByPlan[planType];
  const totalBalance = days * pricePerDay;
  const rangePercent = ((days - 1) / 364) * 100;
  const isAdmin = currentUser?.role === "admin";
  const pendingReviews = reviews.filter((review) => review.status === "pending");

  const isFormComplete =
    formData.name.trim() &&
    mobileRegex.test(formData.number.trim()) &&
    formData.email.trim() &&
    formData.deviceName.trim() &&
    selectedUses.length > 0;

  const visiblePackages = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const maxLeft = filters.maxLeft === "" ? null : Number(filters.maxLeft);

    return packages.filter((item) => {
      const haystack = [
        item.name,
        item.number,
        item.email,
        item.deviceName,
        item.userName,
        item.userNumber,
        ...(item.uses || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = filters.status === "all" || item.status === filters.status;
      const matchesPlan = filters.plan === "all" || item.planType === filters.plan;
      const matchesDays = maxLeft === null || Number(item.daysLeft || 0) <= maxLeft;

      return matchesSearch && matchesStatus && matchesPlan && matchesDays;
    });
  }, [filters, packages]);

  const stats = useMemo(() => {
    const totalRevenue = packages.reduce((sum, item) => sum + Number(item.totalBalance || 0), 0);
    const uniqueUsers = new Set(packages.map((item) => item.userId)).size;

    return {
      users: uniqueUsers,
      packages: packages.length,
      active: packages.filter((item) => item.status === "active").length,
      expiring: packages.filter((item) => item.status === "ending-soon").length,
      expired: packages.filter((item) => item.status === "expired").length,
      revenue: totalRevenue,
      pending: pendingReviews.length,
    };
  }, [packages, pendingReviews.length]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 2400);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setPackages([]);
    setReviews([]);
    setAuthStatus("login");
    setIsFormOpen(false);
  };

  const loadAppData = async () => {
    try {
      setAuthStatus("checking");
      const me = await fetch("/api/me", { headers: authHeader() }).then(readJson);
      setCurrentUser(me.user);

      const [packageResult, settingsResult, reviewResult] = await Promise.all([
        fetch("/api/packages", { headers: authHeader() }).then(readJson),
        fetch("/api/settings", { headers: authHeader() }).then(readJson),
        fetch("/api/reviews", { headers: authHeader() }).then(readJson),
      ]);

      setPackages(packageResult.packages || []);
      setSettings(settingsResult.settings || { editMode: "review", deleteMode: "review" });
      setReviews(reviewResult.reviews || []);
      setAuthStatus("authenticated");
    } catch {
      logout();
    }
  };

  useEffect(() => {
    const session = getStoredSession();

    if (!session) {
      Promise.resolve().then(() => setAuthStatus("login"));
      return;
    }

    Promise.resolve().then(loadAppData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    const number = loginNumber.trim();

    if (!mobileRegex.test(number)) {
      showToast("নাম্বার ১১ ডিজিট হতে হবে এবং 01 দিয়ে শুরু হবে।");
      return;
    }

    try {
      const data = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
      }).then(readJson);

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ token: data.token, expiresAt: data.expiresAt })
      );

      setCurrentUser(data.user);
      showToast("লগইন সফল হয়েছে");
      await loadAppData();
    } catch (error) {
      showToast(error.message);
    }
  };

  const openCreateForm = () => {
    setEditingPackage(null);
    setFormData({ ...emptyForm, number: currentUser?.number || "" });
    setSelectedUses([]);
    setDays(7);
    setPlanType("share");
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingPackage(item);
    setFormData({
      name: item.name || "",
      number: item.number || "",
      email: item.email || "",
      deviceName: item.deviceName || "",
      note: item.note || "",
    });
    setSelectedUses(item.uses || []);
    setDays(Number(item.days || 7));
    setPlanType(item.planType || "share");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPackage(null);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "number" ? value.replace(/\D/g, "").slice(0, 11) : value,
    }));
  };

  const handleUseClick = (use) => {
    setSelectedUses((previous) =>
      previous.includes(use) ? previous.filter((item) => item !== use) : [...previous, use]
    );
  };

  const submitPackage = async (event) => {
    event.preventDefault();
    if (!isFormComplete || isSaving) return;

    const payload = {
      ...formData,
      uses: selectedUses,
      days,
      planType,
      payment: "No",
    };

    try {
      setIsSaving(true);
      const url = editingPackage ? `/api/packages?id=${editingPackage.id}` : "/api/packages";
      const method = editingPackage ? "PATCH" : "POST";
      const data = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      }).then(readJson);

      closeForm();
      await loadAppData();
      showToast(data.reviewRequired ? "রিকোয়েস্ট রিভিউ প্যানেলে পাঠানো হয়েছে" : "ডাটা সেভ হয়েছে");
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePackage = async (item) => {
    const confirmed = window.confirm(
      isAdmin
        ? "এই ডাটা সরাসরি ডিলিট হবে। চালিয়ে যাবেন?"
        : "এই ডিলিট রিকোয়েস্ট অ্যাডমিন রিভিউতে যেতে পারে। চালিয়ে যাবেন?"
    );

    if (!confirmed) return;

    try {
      const data = await fetch(`/api/packages?id=${item.id}`, {
        method: "DELETE",
        headers: authHeader(),
      }).then(readJson);

      await loadAppData();
      showToast(data.reviewRequired ? "ডিলিট রিকোয়েস্ট রিভিউতে পাঠানো হয়েছে" : "ডাটা ডিলিট হয়েছে");
    } catch (error) {
      showToast(error.message);
    }
  };

  const saveSettings = async (nextSettings) => {
    try {
      const data = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ...settings, ...nextSettings }),
      }).then(readJson);

      setSettings(data.settings);
      showToast("সেটিংস আপডেট হয়েছে");
    } catch (error) {
      showToast(error.message);
    }
  };

  const reviewAction = async (reviewId, action) => {
    try {
      await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ reviewId, action }),
      }).then(readJson);

      await loadAppData();
      showToast(action === "approve" ? "রিভিউ approve হয়েছে" : "রিভিউ reject হয়েছে");
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06111f] text-white">
      <style jsx global>{`
        body {
          font-family: Arial, Helvetica, sans-serif;
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
      `}</style>

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.22),transparent_34%),linear-gradient(135deg,#071a2f_0%,#082f2a_45%,#0f172a_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div
          className="absolute inset-[-60px] bg-[linear-gradient(rgba(134,239,172,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.13)_1px,transparent_1px)] bg-[size:24px_24px]"
          style={{ animation: "fallingGrid 3.2s linear infinite" }}
        />
      </div>
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/10 blur-[90px]" />

      {toastMessage && (
        <div className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 border border-emerald-300/60 bg-emerald-950/90 px-4 py-2 text-[11px] text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
          {toastMessage}
        </div>
      )}

      <div className="relative z-10 min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        {authStatus === "checking" && <LoadingPanel />}
        {authStatus === "login" && (
          <LoginPanel loginNumber={loginNumber} onNumberChange={setLoginNumber} onSubmit={handleLogin} />
        )}
        {authStatus === "authenticated" && currentUser && (
          <>
            <Header currentUser={currentUser} isAdmin={isAdmin} onLogout={logout} />

            {isAdmin ? (
              <AdminDashboard
                activeTab={activeAdminTab}
                setActiveTab={setActiveAdminTab}
                filters={filters}
                setFilters={setFilters}
                packages={visiblePackages}
                allPackages={packages}
                stats={stats}
                settings={settings}
                saveSettings={saveSettings}
                reviews={reviews}
                pendingReviews={pendingReviews}
                onApprove={(id) => reviewAction(id, "approve")}
                onReject={(id) => reviewAction(id, "reject")}
                onEdit={openEditForm}
                onDelete={deletePackage}
                onCreate={openCreateForm}
              />
            ) : (
              <UserDashboard
                currentUser={currentUser}
                packages={packages}
                reviews={reviews}
                onEdit={openEditForm}
                onDelete={deletePackage}
                onCreate={openCreateForm}
              />
            )}
          </>
        )}
      </div>

      {isFormOpen && (
        <PackageFormModal
          formData={formData}
          selectedUses={selectedUses}
          days={days}
          planType={planType}
          pricePerDay={pricePerDay}
          totalBalance={totalBalance}
          editingPackage={editingPackage}
          isFormComplete={isFormComplete}
          isSaving={isSaving}
          onInputChange={handleInputChange}
          onUseClick={handleUseClick}
          onDaysChange={setDays}
          onPlanTypeChange={setPlanType}
          onClose={closeForm}
          onSubmit={submitPackage}
        />
      )}
    </main>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-[85vh] items-center justify-center">
      <div className="border border-emerald-300/40 bg-slate-950/60 px-6 py-5 text-center shadow-[0_0_45px_rgba(16,185,129,0.18)] backdrop-blur-2xl">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin border-2 border-emerald-300/20 border-t-emerald-300" />
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Checking Token</p>
      </div>
    </div>
  );
}

function LoginPanel({ loginNumber, onNumberChange, onSubmit }) {
  const isValid = mobileRegex.test(loginNumber.trim());

  return (
    <div className="flex min-h-[88vh] items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[340px] border border-emerald-300/40 bg-gradient-to-br from-cyan-950/55 via-emerald-950/45 to-slate-900/60 p-5 shadow-[0_0_45px_rgba(16,185,129,0.18)] backdrop-blur-2xl"
      >
        <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-200/70">Token not found</p>
        <h1 className="mt-2 text-2xl font-bold text-emerald-100">Login Panel</h1>
        <p className="mt-2 text-[12px] leading-5 text-emerald-50/60">
          শুধু ১১ সংখ্যার মোবাইল নাম্বার দিন। নাম্বার অবশ্যই <span className="text-emerald-200">01</span> দিয়ে শুরু হবে।
        </p>

        <input
          type="tel"
          value={loginNumber}
          onChange={(event) => onNumberChange(event.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="01XXXXXXXXX"
          className="mt-5 h-11 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-sm text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
        />

        <button
          type="submit"
          disabled={!isValid}
          className={`mt-3 h-11 w-full border text-[12px] font-bold uppercase tracking-[0.22em] transition ${
            isValid
              ? "border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:brightness-110 active:scale-[0.99]"
              : "cursor-not-allowed border-emerald-300/30 bg-white/[0.07] text-white/30"
          }`}
        >
          Visit
        </button>

        <p className="mt-3 text-[10px] text-cyan-100/45">একবার লগইন করলে token ১ বছর থাকবে।</p>
      </form>
    </div>
  );
}

function Header({ currentUser, isAdmin, onLogout }) {
  return (
    <header className="mx-auto flex max-w-7xl flex-col gap-3 border border-emerald-300/30 bg-white/[0.06] p-4 shadow-[0_0_35px_rgba(16,185,129,0.12)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-200/70">
          {isAdmin ? "Admin Panel" : "User Panel"}
        </p>
        <h1 className="mt-1 text-xl font-bold text-emerald-100 sm:text-2xl">GPT Customer Data Center</h1>
        <p className="mt-1 text-[12px] text-emerald-50/60">
          {currentUser.name} · {currentUser.number} · Role: <span className="text-emerald-200">{currentUser.role}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="h-10 border border-red-300/35 bg-red-400/10 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-400/20"
      >
        Logout
      </button>
    </header>
  );
}

function UserDashboard({ currentUser, packages, reviews, onEdit, onDelete, onCreate }) {
  const latest = packages[0];

  return (
    <section className="mx-auto mt-5 max-w-7xl space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <InfoCard title="User Details">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniInfo label="Name" value={currentUser.name} />
            <MiniInfo label="Mobile" value={currentUser.number} />
            <MiniInfo label="Role" value={currentUser.role} />
            <MiniInfo label="Total Package" value={packages.length} />
          </div>
        </InfoCard>

        <InfoCard title="Current Package">
          {latest ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniInfo label="Package" value={latest.planType === "personal" ? "Personal" : "Share"} />
              <MiniInfo label="Days Left" value={`${latest.daysLeft} day`} />
              <MiniInfo label="End Date" value={formatDate(latest.endAt)} />
            </div>
          ) : (
            <p className="text-sm text-emerald-50/60">এখনো কোনো package create করা হয়নি। নিচের + বাটনে ক্লিক করুন।</p>
          )}
        </InfoCard>
      </div>

      <InfoCard title="Your Packages">
        <PackageTable packages={packages} onEdit={onEdit} onDelete={onDelete} />
      </InfoCard>

      {reviews.length > 0 && (
        <InfoCard title="Review Status">
          <ReviewList reviews={reviews.slice(0, 5)} />
        </InfoCard>
      )}

      <FloatingCreateButton onClick={onCreate} />
    </section>
  );
}

function AdminDashboard({
  activeTab,
  setActiveTab,
  filters,
  setFilters,
  packages,
  allPackages,
  stats,
  settings,
  saveSettings,
  reviews,
  pendingReviews,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onCreate,
}) {
  return (
    <section className="mx-auto mt-5 max-w-7xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Packages" value={stats.packages} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Ending" value={stats.expiring} />
        <StatCard label="Expired" value={stats.expired} />
        <StatCard label="Revenue" value={money(stats.revenue)} />
        <StatCard label="Review" value={stats.pending} />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["packages", "All Data"],
          ["reviews", `Review Panel (${pendingReviews.length})`],
          ["settings", "Settings"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`h-10 border px-4 text-[11px] font-bold uppercase tracking-[0.15em] transition ${
              activeTab === value
                ? "border-emerald-200 bg-emerald-300/25 text-emerald-50"
                : "border-emerald-300/30 bg-white/[0.06] text-emerald-100/65 hover:bg-emerald-300/10"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onCreate}
          className="ml-auto h-10 border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-950 transition hover:brightness-110"
        >
          + New Package
        </button>
      </div>

      {activeTab === "packages" && (
        <InfoCard title={`All Customer Data (${packages.length}/${allPackages.length})`}>
          <AdminFilters filters={filters} setFilters={setFilters} />
          <PackageTable packages={packages} onEdit={onEdit} onDelete={onDelete} showOwner />
        </InfoCard>
      )}

      {activeTab === "reviews" && (
        <InfoCard title="Review Panel">
          <AdminReviewPanel reviews={reviews} onApprove={onApprove} onReject={onReject} />
        </InfoCard>
      )}

      {activeTab === "settings" && (
        <InfoCard title="Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingBlock
              title="User Edit"
              description="User edit করলে সরাসরি save হবে, নাকি admin review এ যাবে।"
              value={settings.editMode}
              onChange={(editMode) => saveSettings({ editMode })}
            />
            <SettingBlock
              title="User Delete"
              description="User delete করলে সরাসরি remove হবে, নাকি admin review panel এ যাবে।"
              value={settings.deleteMode}
              onChange={(deleteMode) => saveSettings({ deleteMode })}
            />
          </div>
        </InfoCard>
      )}
    </section>
  );
}

function AdminFilters({ filters, setFilters }) {
  const update = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="mb-4 grid gap-2 md:grid-cols-4">
      <input
        value={filters.search}
        onChange={(event) => update("search", event.target.value)}
        placeholder="Search name, number, email..."
        className="h-10 border border-emerald-300/35 bg-white/[0.07] px-3 text-[12px] text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-300"
      />
      <select
        value={filters.status}
        onChange={(event) => update("status", event.target.value)}
        className="h-10 border border-emerald-300/35 bg-slate-950/80 px-3 text-[12px] text-white outline-none focus:border-emerald-300"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="ending-soon">Ending Soon</option>
        <option value="expired">Expired</option>
      </select>
      <select
        value={filters.plan}
        onChange={(event) => update("plan", event.target.value)}
        className="h-10 border border-emerald-300/35 bg-slate-950/80 px-3 text-[12px] text-white outline-none focus:border-emerald-300"
      >
        <option value="all">All Package</option>
        <option value="share">Share</option>
        <option value="personal">Personal</option>
      </select>
      <input
        value={filters.maxLeft}
        onChange={(event) => update("maxLeft", event.target.value.replace(/\D/g, ""))}
        placeholder="Max days left"
        className="h-10 border border-emerald-300/35 bg-white/[0.07] px-3 text-[12px] text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-300"
      />
    </div>
  );
}

function PackageTable({ packages, onEdit, onDelete, showOwner = false }) {
  if (!packages.length) {
    return <p className="py-8 text-center text-sm text-emerald-50/55">কোনো ডাটা পাওয়া যায়নি।</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-emerald-300/25 text-[10px] uppercase tracking-[0.18em] text-emerald-100/65">
            {showOwner && <th className="px-3 py-3">Owner</th>}
            <th className="px-3 py-3">Customer</th>
            <th className="px-3 py-3">Package</th>
            <th className="px-3 py-3">Use</th>
            <th className="px-3 py-3">Bought</th>
            <th className="px-3 py-3">Duration</th>
            <th className="px-3 py-3">Left</th>
            <th className="px-3 py-3">Bill</th>
            <th className="px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((item) => (
            <tr key={item.id} className="border-b border-emerald-300/10 text-emerald-50/80 transition hover:bg-emerald-300/[0.04]">
              {showOwner && (
                <td className="px-3 py-3 align-top">
                  <p className="font-semibold text-emerald-100">{item.userName}</p>
                  <p className="mt-1 text-[10px] text-cyan-100/50">{item.userNumber}</p>
                </td>
              )}
              <td className="px-3 py-3 align-top">
                <p className="font-semibold text-emerald-100">{item.name}</p>
                <p className="mt-1 text-[10px] text-cyan-100/55">{item.number}</p>
                <p className="mt-1 text-[10px] text-cyan-100/45">{item.email}</p>
                <p className="mt-1 text-[10px] text-cyan-100/45">Device: {item.deviceName}</p>
              </td>
              <td className="px-3 py-3 align-top">
                <Badge>{item.planType === "personal" ? "Personal" : "Share"}</Badge>
                <p className="mt-2 text-[10px] text-cyan-100/50">{money(item.pricePerDay)}/day</p>
              </td>
              <td className="px-3 py-3 align-top">
                <div className="flex max-w-[180px] flex-wrap gap-1">
                  {(item.uses || []).map((use) => <Badge key={use}>{use}</Badge>)}
                </div>
              </td>
              <td className="px-3 py-3 align-top">
                <p>{formatDate(item.createdAt)}</p>
                <p className="mt-1 text-[10px] text-cyan-100/50">{formatTime(item.createdAt)}</p>
              </td>
              <td className="px-3 py-3 align-top">
                <p>{item.usedDays}/{item.days} day</p>
                <p className="mt-1 text-[10px] text-cyan-100/50">End: {formatDate(item.endAt)}</p>
              </td>
              <td className="px-3 py-3 align-top">
                <Badge tone={item.status === "expired" ? "red" : item.status === "ending-soon" ? "yellow" : "green"}>
                  {item.daysLeft} day
                </Badge>
                <p className="mt-2 text-[10px] text-cyan-100/50">{statusLabel[item.status]}</p>
              </td>
              <td className="px-3 py-3 align-top">
                <p className="font-bold text-emerald-200">{money(item.totalBalance)}</p>
                <p className="mt-1 text-[10px] text-cyan-100/50">Payment: {item.payment}</p>
              </td>
              <td className="px-3 py-3 align-top">
                <div className="flex gap-1">
                  <button type="button" onClick={() => onEdit(item)} className="border border-cyan-300/35 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-300/20">
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(item)} className="border border-red-300/35 bg-red-400/10 px-2 py-1 text-[10px] text-red-100 hover:bg-red-400/20">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackageFormModal({
  formData,
  selectedUses,
  days,
  planType,
  pricePerDay,
  totalBalance,
  editingPackage,
  isFormComplete,
  isSaving,
  onInputChange,
  onUseClick,
  onDaysChange,
  onPlanTypeChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 px-4 py-6 backdrop-blur-md">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[520px] border border-emerald-300/40 bg-gradient-to-br from-cyan-950/75 via-emerald-950/65 to-slate-900/80 p-4 shadow-[0_0_55px_rgba(52,211,153,0.22)] backdrop-blur-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">
              {editingPackage ? "Edit Data" : "Create New"}
            </p>
            <h2 className="mt-1 text-base font-bold text-emerald-100">Package Details</h2>
          </div>
          <button type="button" onClick={onClose} className="border border-emerald-300/35 bg-white/[0.07] px-2 py-1 text-xs text-white/70 hover:border-red-300/50 hover:text-red-200">
            ✕
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="name" placeholder="Name" value={formData.name} onChange={onInputChange} />
          <Input name="number" type="tel" placeholder="Number" value={formData.number} onChange={onInputChange} />
          <Input name="email" type="email" placeholder="Email" value={formData.email} onChange={onInputChange} />
          <Input name="deviceName" placeholder="Device Name" value={formData.deviceName} onChange={onInputChange} />
        </div>

        <div className="mt-2 border border-emerald-300/45 bg-white/[0.07] px-2.5 py-2">
          <label className="mb-1.5 block text-[9px] uppercase tracking-widest text-emerald-100/80">Package Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {["share", "personal"].map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => onPlanTypeChange(plan)}
                className={`h-8 border text-[10px] font-medium uppercase tracking-wider transition-all ${
                  planType === plan
                    ? "border-emerald-200 bg-emerald-300/30 text-emerald-50 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                    : "border-emerald-300/45 bg-white/[0.06] text-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-300/10"
                }`}
              >
                {plan === "share" ? "Share" : "Personal"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="border border-emerald-300/45 bg-white/[0.07] px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-widest text-emerald-100/80">Days</p>
            <div className="my-1 flex items-end gap-1">
              <h2 className="text-2xl font-bold leading-none text-emerald-200">{days}</h2>
              <span className="text-[11px] font-semibold text-emerald-300">day</span>
            </div>
            <input type="range" min="1" max="365" value={days} onChange={(event) => onDaysChange(Number(event.target.value))} className="cursor-pointer" />
          </div>
          <div className="border border-emerald-300/45 bg-gradient-to-r from-emerald-400/15 to-cyan-400/10 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-widest text-emerald-100">Balance</p>
            <h2 className="mt-1 text-2xl font-bold leading-none text-emerald-200">{money(totalBalance)}</h2>
            <p className="mt-1 text-[11px] font-semibold text-cyan-200">{money(pricePerDay)}/day</p>
            <p className="text-[9px] text-emerald-100/70">{days} × {money(pricePerDay)}</p>
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-emerald-100/80">Use</p>
          <div className="grid grid-cols-4 gap-1.5">
            {uses.map((item) => {
              const selected = selectedUses.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onUseClick(item)}
                  className={`min-h-[28px] border px-1 text-[10px] transition-all duration-200 ${
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

        <textarea
          name="note"
          value={formData.note}
          onChange={onInputChange}
          placeholder="Note / extra details"
          className="mt-2 h-20 w-full resize-none border border-emerald-300/45 bg-white/[0.08] px-3 py-2 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
        />

        <button
          type="submit"
          disabled={!isFormComplete || isSaving}
          className={`mt-3 h-10 w-full border text-[11px] font-bold uppercase tracking-[0.22em] transition ${
            isFormComplete && !isSaving
              ? "border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:brightness-110 active:scale-[0.99]"
              : "cursor-not-allowed border-emerald-300/30 bg-white/[0.07] text-white/30"
          }`}
        >
          {isSaving ? "Saving..." : editingPackage ? "Update" : "Create"}
        </button>
      </form>
    </div>
  );
}

function AdminReviewPanel({ reviews, onApprove, onReject }) {
  if (!reviews.length) {
    return <p className="py-8 text-center text-sm text-emerald-50/55">কোনো review request নেই।</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="border border-emerald-300/25 bg-white/[0.05] p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={review.type === "delete" ? "red" : "green"}>{reviewTypeLabel[review.type]}</Badge>
                <Badge tone={review.status === "pending" ? "yellow" : review.status === "approved" ? "green" : "red"}>{review.status}</Badge>
              </div>
              <h3 className="mt-2 font-bold text-emerald-100">{review.userName} · {review.userNumber}</h3>
              <p className="mt-1 text-[11px] text-cyan-100/55">Requested: {formatDate(review.requestedAt)} {formatTime(review.requestedAt)}</p>
              {review.package && (
                <p className="mt-2 text-[12px] text-emerald-50/75">
                  {review.package.name} · {review.package.number} · {review.package.planType} · {review.package.days} day
                </p>
              )}
            </div>
            {review.status === "pending" && (
              <div className="flex gap-2">
                <button type="button" onClick={() => onApprove(review.id)} className="border border-emerald-200 bg-emerald-300/20 px-3 py-2 text-[11px] font-bold text-emerald-100 hover:bg-emerald-300/30">
                  Save
                </button>
                <button type="button" onClick={() => onReject(review.id)} className="border border-red-300/35 bg-red-400/10 px-3 py-2 text-[11px] font-bold text-red-100 hover:bg-red-400/20">
                  Remove
                </button>
              </div>
            )}
          </div>
          {review.type === "edit" && review.payload && (
            <div className="mt-3 grid gap-2 text-[11px] text-emerald-50/65 sm:grid-cols-2 lg:grid-cols-4">
              <MiniInfo label="New Name" value={review.payload.name} />
              <MiniInfo label="New Number" value={review.payload.number} />
              <MiniInfo label="New Package" value={review.payload.planType} />
              <MiniInfo label="New Days" value={`${review.payload.days} day`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewList({ reviews }) {
  return (
    <div className="space-y-2">
      {reviews.map((review) => (
        <div key={review.id} className="flex items-center justify-between border border-emerald-300/20 bg-white/[0.04] px-3 py-2 text-[12px]">
          <span>{reviewTypeLabel[review.type]} · {formatDate(review.requestedAt)}</span>
          <Badge tone={review.status === "pending" ? "yellow" : review.status === "approved" ? "green" : "red"}>{review.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function SettingBlock({ title, description, value, onChange }) {
  return (
    <div className="border border-emerald-300/25 bg-white/[0.05] p-4">
      <h3 className="font-bold text-emerald-100">{title}</h3>
      <p className="mt-1 text-[12px] leading-5 text-emerald-50/55">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ["direct", "Direct Save"],
          ["review", "Review First"],
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`h-10 border text-[11px] font-bold uppercase tracking-[0.14em] transition ${
              value === mode
                ? "border-emerald-200 bg-emerald-300/25 text-emerald-50"
                : "border-emerald-300/30 bg-white/[0.06] text-emerald-100/65 hover:bg-emerald-300/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="border border-emerald-300/30 bg-white/[0.06] p-4 shadow-[0_0_35px_rgba(16,185,129,0.1)] backdrop-blur-2xl">
      <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.22em] text-emerald-100">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border border-emerald-300/30 bg-white/[0.06] p-3 shadow-[0_0_25px_rgba(16,185,129,0.08)] backdrop-blur-2xl">
      <p className="text-[9px] uppercase tracking-[0.22em] text-cyan-100/55">{label}</p>
      <h3 className="mt-2 text-xl font-bold text-emerald-200">{value}</h3>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="border border-emerald-300/20 bg-slate-950/25 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-100/45">{label}</p>
      <p className="mt-1 break-words text-[12px] font-semibold text-emerald-50/85">{value || "-"}</p>
    </div>
  );
}

function Input({ name, value, onChange, placeholder, type = "text" }) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="h-9 w-full border border-emerald-300/45 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
    />
  );
}

function Badge({ children, tone = "green" }) {
  const tones = {
    green: "border-emerald-300/35 bg-emerald-300/12 text-emerald-100",
    yellow: "border-yellow-300/35 bg-yellow-300/12 text-yellow-100",
    red: "border-red-300/35 bg-red-400/12 text-red-100",
  };

  return <span className={`inline-flex border px-2 py-1 text-[10px] ${tones[tone]}`}>{children}</span>;
}

function FloatingCreateButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-40 h-14 w-14 border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-3xl font-bold leading-none text-slate-950 shadow-[0_0_35px_rgba(45,212,191,0.35)] transition hover:brightness-110 active:scale-95"
      aria-label="Create package"
    >
      +
    </button>
  );
}
