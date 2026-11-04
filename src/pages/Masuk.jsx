import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Lock,
  Sparkles,
  GraduationCap,
  School,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Loader2,
  BookOpen,
  Award,
  Video,
  Check,
  Compass,
  MessageSquare,
  Sparkle,
  Zap,
} from "lucide-react";

export function Masuk() {
  const {
    loginMuridGoogle,
    loginGuru,
    resetPassword,
    currentUser,
    role,
    isInAppBrowser,
  } = useAuth();
  const [activeTab, setActiveTab] = useState("murid"); // "murid" | "guru"
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Form Guru
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Interactive micro-state
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from || "/murid";

  const features = [
    {
      title: "Materi Interaktif Berdiferensiasi",
      desc: "Pelajari materi teks rekon dan kebahasaan yang adaptif sesuai jenjang kelas.",
      icon: BookOpen,
      badge: "Kurikulum Merdeka",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Kuis Pintar Berwaktu Real-time",
      desc: "Uji pemahaman lewat kuis objektif berbobot dengan pembahasan instan.",
      icon: Award,
      badge: "Live Score",
      color: "from-amber-500 to-orange-500",
    },
    {
      title: "Tatap Muka & Mading Digital",
      desc: "Tatap muka online berfitur interaktif dan publikasi karya kreasi siswa.",
      icon: Video,
      badge: "Kolaboratif",
      color: "from-emerald-500 to-teal-500",
    },
  ];

  // Auto carousel highlight
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIdx((prev) => (prev + 1) % features.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [features.length]);

  // Redirect otomatis jika pengguna sudah memiliki role
  useEffect(() => {
    if (currentUser && role) {
      if (role === "guru") {
        navigate("/guru", { replace: true });
      } else if (role === "murid") {
        navigate(redirectTarget, { replace: true });
      } else if (role === "unactivated") {
        navigate("/aktivasi", { replace: true });
      }
    }
  }, [currentUser, role, navigate, redirectTarget]);

  // Login Siswa dengan Google
  async function handleGoogleLogin() {
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const res = await loginMuridGoogle();
      if (res?.role === "guru") {
        navigate("/guru", { replace: true });
      } else if (res?.role === "murid") {
        navigate(redirectTarget, { replace: true });
      } else {
        navigate("/aktivasi", { replace: true });
      }
    } catch (err) {
      console.error("Gagal login Google:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Proses masuk dibatalkan oleh pengguna.");
      } else {
        setError(
          err.message ||
            "Gagal masuk dengan akun Google. Silakan periksa koneksi atau coba lagi."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Login Guru dengan Email & Password
  async function handleGuruSubmit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);

    try {
      if (isResetMode) {
        await resetPassword(email);
        setMsg("Tautan pemulihan password telah dikirim ke email Anda.");
      } else {
        await loginGuru(email, password);
        navigate("/guru", { replace: true });
      }
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Email atau kata sandi tidak cocok. Mohon periksa kembali.");
      } else {
        setError(
          err.message || "Gagal masuk. Periksa koneksi internet atau kredensial Anda."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden bg-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Background Animated Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[110px] animate-blob-1"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] bg-indigo-600/25 rounded-full blur-[120px] animate-blob-2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[40%] left-[50%] -translate-x-1/2 w-[420px] h-[420px] bg-sky-500/15 rounded-full blur-[100px] animate-blob-3"
      />

      {/* Grid Pattern Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]"
      />

      {/* Main Container */}
      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* SISI KIRI (Desktop Hero Showcase / Interaktif) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4 text-white">
          <div className="space-y-4">
            {/* School Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-sky-200 shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span>SMP Negeri 3 Ketapang</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">LMS Merdeka</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-sky-200">
              Gerbang Belajar Mandiri & Berkolaborasi.
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              Satu portal terpadu untuk siswa dan pendidik dalam mengeksplorasi modul, menuntaskan kuis interaktif, serta berkarya bersama.
            </p>
          </div>

          {/* Interactive Feature Slider / Preview Cards */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Fitur Unggulan Pembelajaran</span>
            </div>

            <div className="space-y-2.5">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                const isActive = idx === activeFeatureIdx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveFeatureIdx(idx)}
                    className={`cursor-pointer group relative p-3.5 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? "bg-white/10 backdrop-blur-md border-white/30 shadow-lg shadow-blue-500/10 scale-[1.02]"
                        : "bg-white/5 backdrop-blur-xs border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`p-2.5 rounded-xl bg-gradient-to-tr ${feat.color} text-white shadow-md shrink-0 transition-transform group-hover:scale-110`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight truncate">
                            {feat.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isActive
                                ? "bg-sky-400/20 text-sky-300 border border-sky-400/30"
                                : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {feat.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300/80 mt-0.5 leading-snug">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trust badges */}
          <div className="pt-2 flex items-center gap-6 text-xs text-slate-400 border-t border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Satu Akun Terverifikasi</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Akses Cepat & Ringan</span>
            </div>
          </div>
        </div>

        {/* SISI KANAN (Form Card Glassmorphism) */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="relative rounded-3xl bg-white/95 sm:bg-white/[0.97] backdrop-blur-2xl border border-white/30 shadow-2xl shadow-black/40 overflow-hidden transition-all duration-300">
            
            {/* Top Accent Gradient Line */}
            <div
              className={`h-1.5 w-full bg-gradient-to-r transition-all duration-500 ${
                activeTab === "murid"
                  ? "from-blue-600 via-sky-500 to-indigo-600"
                  : "from-indigo-600 via-purple-600 to-pink-500"
              }`}
            />

            {/* Header Content */}
            <div className="pt-6 pb-2 px-6 sm:px-8 text-center space-y-3">
              {/* Logo Brand with glowing ring */}
              <div className="flex items-center justify-center">
                <div className="relative p-2 rounded-2xl bg-white border border-slate-200/90 shadow-md ring-4 ring-blue-500/10 group transition-transform hover:scale-105 duration-300">
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
                    className="w-12 h-12 object-contain"
                    alt="Logo SMPN 3 Ketapang"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full shadow-sm">
                    {activeTab === "murid" ? (
                      <GraduationCap className="w-3.5 h-3.5" />
                    ) : (
                      <School className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {activeTab === "murid" ? "Portal Siswa" : "Portal Guru"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {activeTab === "murid"
                    ? "Masuk dengan Google untuk akses materi & tugas"
                    : "Masuk dengan email resmi guru SMPN 3 Ketapang"}
                </p>
              </div>

              {/* Interactive Role Switcher Pill */}
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl gap-1 border border-slate-200/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("murid");
                    setError("");
                    setMsg("");
                  }}
                  className={`py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs font-bold ${
                    activeTab === "murid"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/60 scale-[1.01]"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Siswa / Murid</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("guru");
                    setError("");
                    setMsg("");
                  }}
                  className={`py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs font-bold ${
                    activeTab === "guru"
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60 scale-[1.01]"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <School className="w-4 h-4" />
                  <span>Guru / Pengampu</span>
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-6 sm:px-8 space-y-4">
              {/* Notice for required authentication */}
              {location.state?.from && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2.5 font-medium shadow-xs">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Silakan masuk terlebih dahulu untuk mengakses konten ini.</span>
                </div>
              )}

              {/* In-App Browser Warning */}
              {isInAppBrowser && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed shadow-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Jika tombol Google tidak merespon di browser aplikasi medsos, ketuk titik tiga lalu pilih <b>Buka di Chrome/Browser</b>.
                  </span>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed shadow-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Alert */}
              {msg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed shadow-xs animate-in fade-in duration-200">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{msg}</span>
                </div>
              )}

              {/* VIEW 1: TAB SISWA (GOOGLE SIGN-IN) */}
              {activeTab === "murid" && (
                <div className="space-y-4">
                  {/* Visual Benefit Highlight Box */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border border-blue-100 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Masuk Mudah Tanpa Password Ribet</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Siswa cukup menautkan akun Google. Sistem akan otomatis mendeteksi NISN atau mengarahkan ke halaman aktivasi kelas.
                    </p>
                  </div>

                  {/* Modern Redesigned Google Sign-In Button */}
                  <div className="relative group">
                    {/* Ambient Glow Effect on Hover */}
                    <div
                      aria-hidden="true"
                      className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 rounded-2xl blur-md opacity-25 group-hover:opacity-75 transition-opacity duration-300 -z-10"
                    />

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="relative w-full h-14 px-5 rounded-2xl bg-white hover:bg-slate-50/90 text-slate-800 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex items-center justify-between active:scale-[0.985] disabled:opacity-60 disabled:pointer-events-none overflow-hidden"
                    >
                      {/* Subtle hover gradient sweep background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                      {loading ? (
                        <div className="w-full flex items-center justify-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-700">
                            Menghubungkan ke Google...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Google Logo with rounded container */}
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-2 transition-transform duration-300">
                              <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                  fill="#4285F4"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                  fill="#EA4335"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                              </svg>
                            </div>

                            <div className="text-left flex flex-col">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                                Lanjutkan dengan Google
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Akun Belajar / Google Pribadi
                              </span>
                            </div>
                          </div>

                          {/* Interactive Arrow Pill */}
                          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:translate-x-0.5 shadow-xs">
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feature Quick Badges */}
                  <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 transition-colors hover:bg-blue-50/50">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-700">Materi</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 transition-colors hover:bg-amber-50/50">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold text-slate-700">Kuis & Nilai</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 transition-colors hover:bg-indigo-50/50">
                      <Video className="w-4 h-4 text-indigo-600" />
                      <span className="text-[10px] font-bold text-slate-700">Live Meet</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: TAB GURU (EMAIL & PASSWORD) */}
              {activeTab === "guru" && (
                <form onSubmit={handleGuruSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email Pendidik
                    </label>
                    <Input
                      type="email"
                      placeholder="guru@smpn3ketapang.sch.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white text-xs sm:text-sm pl-3.5 transition-all focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>

                  {/* Password Input */}
                  {!isResetMode && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          Kata Sandi
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetMode(true);
                            setError("");
                            setMsg("");
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Lupa kata sandi?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white text-xs sm:text-sm pl-3.5 pr-11 transition-all focus:ring-2 focus:ring-indigo-500/20"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {isResetMode && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(false);
                          setError("");
                          setMsg("");
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Kembali ke Form Masuk
                      </button>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    type="submit"
                    className="w-full h-11 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memverifikasi...
                      </span>
                    ) : isResetMode ? (
                      "Kirim Tautan Reset Password"
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>Masuk ke Panel Guru</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* Card Footer Security Assurance */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Koneksi Aman SSL 256-Bit</span>
                </div>
                <Link
                  to="/"
                  className="font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Ke Beranda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
