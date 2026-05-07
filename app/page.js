"use client";

import React, { useEffect, useState } from "react";

const uses = [
  "Image",
  "Code",
  "Analysis",
  "Study",
  "Writing",
  "Email",
  "Business",
  "Research",
  "Translate",
  "Resume",
  "Social",
  "Slide",
  "PDF",
  "Math",
  "Travel",
];

const Page = () => {
  const [selectedUses, setSelectedUses] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [days, setDays] = useState(7);

  const totalBalance = days * 5;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleUseClick = (use) => {
    setSelectedUses((prev) => {
      if (prev.includes(use)) {
        return prev.filter((item) => item !== use);
      }

      return [...prev, use];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020617] text-white">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap");

        body {
          font-family: "Share Tech Mono", monospace;
        }

        input[type="range"] {
          accent-color: #34d399;
        }

        .falling-grid {
          background-image:
            linear-gradient(rgba(52, 211, 153, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(52, 211, 153, 0.12) 1px, transparent 1px);
          background-size: 26px 26px;
          animation: gridFall 7s linear infinite;
        }

        .falling-grid-strong {
          background-image:
            linear-gradient(rgba(34, 211, 238, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.08) 1px, transparent 1px);
          background-size: 52px 52px;
          animation: gridFall 13s linear infinite;
        }

        .scan-line {
          animation: scanMove 3.5s ease-in-out infinite;
        }

        @keyframes gridFall {
          from {
            background-position: 0 -80px;
          }
          to {
            background-position: 0 80px;
          }
        }

        @keyframes scanMove {
          0% {
            transform: translateY(-120%);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(120vh);
            opacity: 0;
          }
        }
      `}</style>

      {/* Animated Highlight Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.28),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(52,211,153,0.22),transparent_36%)]" />
      <div className="falling-grid-strong absolute inset-0 opacity-70" />
      <div className="falling-grid absolute inset-0 opacity-100" />
      <div className="scan-line absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent blur-sm" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.12),rgba(2,6,23,0.55))]" />

      {showToast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-emerald-400/50 bg-black/90 px-4 py-2 text-[11px] text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.55)]">
          Package generated successfully
        </div>
      )}

      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[305px] border border-emerald-400/25 bg-black/55 p-4 shadow-[0_0_45px_rgba(16,185,129,0.22)] backdrop-blur-xl sm:max-w-[320px]"
        >
          {/* Inputs */}
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Name"
              className="h-9 w-full border border-emerald-400/20 bg-black/45 px-3 text-[11px] text-white outline-none placeholder:text-slate-500 transition focus:border-emerald-300 focus:bg-black/70"
            />

            <input
              type="tel"
              placeholder="Number"
              className="h-9 w-full border border-emerald-400/20 bg-black/45 px-3 text-[11px] text-white outline-none placeholder:text-slate-500 transition focus:border-emerald-300 focus:bg-black/70"
            />

            <input
              type="email"
              placeholder="Email"
              className="h-9 w-full border border-emerald-400/20 bg-black/45 px-3 text-[11px] text-white outline-none placeholder:text-slate-500 transition focus:border-emerald-300 focus:bg-black/70"
            />

            {/* Days Range */}
            <div className="border border-emerald-400/20 bg-black/45 px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest text-slate-300">
                  Days
                </label>

                <span className="text-[10px] text-emerald-300">
                  {days} day{days > 1 ? "s" : ""}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-1 w-full cursor-pointer"
              />

              <div className="mt-1 flex justify-between text-[8px] text-slate-500">
                <span>1</span>
                <span>30</span>
              </div>
            </div>

            {/* Balance Display */}
            <div className="border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-cyan-200">
                  Balance
                </span>

                <span className="text-[15px] font-bold text-emerald-300">
                  ৳{totalBalance}
                </span>
              </div>

              <p className="mt-1 text-[9px] text-slate-400">
                {days} days × ৳5 per day
              </p>
            </div>
          </div>

          {/* Use */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-slate-300">
                Use
              </p>

              <span className="bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">
                {selectedUses.length} selected
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {uses.map((use) => {
                const isSelected = selectedUses.includes(use);

                return (
                  <button
                    key={use}
                    type="button"
                    onClick={() => handleUseClick(use)}
                    className={`h-7 border text-[9px] transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-300/85 text-black shadow-[0_0_16px_rgba(52,211,153,0.55)]"
                        : "border-white/10 bg-black/30 text-slate-300 hover:border-emerald-300/60 hover:bg-emerald-300/10 hover:text-emerald-200"
                    }`}
                  >
                    {use}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 h-10 w-full border border-emerald-300 bg-gradient-to-r from-emerald-400 to-cyan-300 text-[11px] font-bold uppercase tracking-[0.22em] text-black shadow-[0_0_28px_rgba(45,212,191,0.35)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Generate
          </button>
        </form>
      </div>
    </main>
  );
};

export default Page;