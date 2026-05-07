"use client";

import React, { useEffect, useMemo, useState } from "react";

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

const PRICE_PER_DAY = 5;
const WHATSAPP_NUMBER = "8801741815153";

const Page = () => {
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    email: "",
  });

  const [selectedUses, setSelectedUses] = useState([]);
  const [days, setDays] = useState(7);
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(new Date());

  const totalBalance = days * PRICE_PER_DAY;

  const isFormComplete =
    formData.name.trim() &&
    formData.number.trim() &&
    formData.email.trim() &&
    selectedUses.length > 0;

  const rangePercent = ((days - 1) / 29) * 100;

  const formattedDate = useMemo(() => {
    return generatedAt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Dhaka",
    });
  }, [generatedAt]);

  const formattedTime = useMemo(() => {
    return generatedAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka",
    });
  }, [generatedAt]);

  const previewText = useMemo(() => {
    return `🤖 ChatGPT User Info
👤 Name: ${formData.name}
📞 Number: ${formData.number}
📧 Email: ${formData.email}
⏳ Duration: ${days} day${days > 1 ? "s" : ""}
💸 Price: ৳${PRICE_PER_DAY}/day
🧾 Total Bill: ৳${totalBalance}
🛠️ Use For: ${selectedUses.join(", ")}
📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
💳 Payment: No`;
  }, [formData, days, totalBalance, selectedUses, formattedDate, formattedTime]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUseClick = (use) => {
    setSelectedUses((prev) => {
      if (prev.includes(use)) {
        return prev.filter((item) => item !== use);
      }

      return [...prev, use];
    });
  };

  const handleGenerate = (e) => {
    e.preventDefault();

    if (!isFormComplete) return;

    const now = new Date();
    setGeneratedAt(now);
    setIsModalOpen(true);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleSendWhatsApp = () => {
    const message = encodeURIComponent(previewText);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    window.open(whatsappUrl, "_blank");

    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#06111f] text-white">
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
          height: 4px;
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
          0% {
            transform: translateY(-48px);
          }
          100% {
            transform: translateY(48px);
          }
        }

        @keyframes scanDown {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        @keyframes spinGlow {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.22),transparent_34%),linear-gradient(135deg,#071a2f_0%,#082f2a_45%,#0f172a_100%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div
          className="absolute inset-[-60px] bg-[linear-gradient(rgba(134,239,172,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.13)_1px,transparent_1px)] bg-[size:24px_24px]"
          style={{ animation: "fallingGrid 3.2s linear infinite" }}
        />
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-36 bg-gradient-to-b from-emerald-300/20 via-cyan-300/10 to-transparent"
        style={{ animation: "scanDown 4s linear infinite" }}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 bg-emerald-400/10 blur-[90px]" />

      {showToast && (
        <div className="fixed left-1/2 top-4 z-[70] -translate-x-1/2 border border-emerald-300/50 bg-emerald-950/90 px-4 py-2 text-[11px] text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
          WhatsApp opened successfully
        </div>
      )}

      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <form
          onSubmit={handleGenerate}
          className="w-full max-w-[315px] border border-emerald-300/25 bg-gradient-to-br from-cyan-950/55 via-emerald-950/45 to-slate-900/60 p-4 shadow-[0_0_45px_rgba(16,185,129,0.18)] backdrop-blur-2xl sm:max-w-[335px]"
        >
          <div className="space-y-2.5">
            <input
              name="name"
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={handleInputChange}
              className="h-9 w-full border border-white/10 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
            />

            <input
              name="number"
              type="tel"
              placeholder="Number"
              value={formData.number}
              onChange={handleInputChange}
              className="h-9 w-full border border-white/10 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              className="h-9 w-full border border-white/10 bg-white/[0.08] px-3 text-[11px] text-white outline-none placeholder:text-emerald-100/35 transition focus:border-emerald-300 focus:bg-emerald-400/10"
            />

            {/* Days */}
            <div className="border border-white/10 bg-white/[0.07] px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest text-emerald-100/80">
                  Days
                </label>

                <span className="text-[10px] font-semibold text-emerald-300">
                  {days} day{days > 1 ? "s" : ""}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="cursor-pointer"
              />

              <div className="mt-1 flex justify-between text-[8px] text-emerald-100/35">
                <span>1</span>
                <span>30</span>
              </div>
            </div>

            {/* Balance */}
            <div className="border border-emerald-300/30 bg-gradient-to-r from-emerald-400/15 to-cyan-400/10 px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-emerald-100">
                  Balance
                </p>

                <span className="text-[10px] text-cyan-200">
                  ৳{PRICE_PER_DAY}/day
                </span>
              </div>

              <div className="mt-1 flex items-end justify-between">
                <h2 className="text-xl font-bold text-emerald-200">
                  ৳{totalBalance}
                </h2>

                <p className="text-[9px] text-emerald-100/70">
                  {days} × ৳{PRICE_PER_DAY}
                </p>
              </div>
            </div>
          </div>

          {/* Use */}
          <div className="mt-4">
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-widest text-emerald-100/80">
                Use
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {uses.map((item) => {
                const isSelected = selectedUses.includes(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleUseClick(item)}
                    className={`min-h-[29px] border px-2 text-[9px] transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-300/30 text-emerald-50 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                        : "border-white/10 bg-white/[0.06] text-emerald-100/70 hover:border-emerald-300/50 hover:bg-emerald-300/10 hover:text-emerald-100"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormComplete}
            className={`mt-4 h-10 w-full border text-[11px] font-bold uppercase tracking-[0.22em] transition ${
              isFormComplete
                ? "border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:brightness-110 active:scale-[0.99]"
                : "cursor-not-allowed border-white/10 bg-white/[0.07] text-white/30"
            }`}
          >
            Generate
          </button>
        </form>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md">
          <div className="w-full max-w-[330px] border border-emerald-300/30 bg-gradient-to-br from-slate-900 via-emerald-950 to-cyan-950 p-4 shadow-[0_0_55px_rgba(52,211,153,0.22)]">
            {isLoading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <div
                  className="mb-4 h-14 w-14 border-2 border-emerald-300/20 border-t-emerald-300"
                  style={{ animation: "spinGlow 0.8s linear infinite" }}
                />

                <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">
                  Generating
                </p>

                <p
                  className="mt-2 text-[10px] text-cyan-100/60"
                  style={{ animation: "blink 1s ease-in-out infinite" }}
                >
                  Preparing preview screen...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">
                      Preview Ready
                    </p>
                    <h2 className="mt-1 text-base font-bold text-emerald-100">
                      Package Details
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="border border-white/10 bg-white/[0.07] px-2 py-1 text-xs text-white/70 hover:border-red-300/50 hover:text-red-200"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  value={previewText}
                  readOnly
                  className="h-56 w-full resize-none border border-white/10 bg-white/[0.08] p-3 text-[11px] leading-5 text-emerald-50 outline-none"
                />

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="mt-3 h-10 w-full border border-emerald-200 bg-gradient-to-r from-emerald-300 to-cyan-300 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-950 transition hover:brightness-110 active:scale-[0.99]"
                >
                  Send
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Page;