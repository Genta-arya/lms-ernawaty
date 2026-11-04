import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from || "/murid";

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
        setError("Proses masuk dibatalkan.");
      } else {
        setError(
          err.message ||
          "Gagal masuk dengan akun Google. Silakan coba kembali."
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
        setError("Email atau password tidak sesuai.");
      } else {
        setError(
          err.message || "Gagal masuk. Periksa koneksi atau kredensial Anda."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      {/* Decorative Ambient Background Elements */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <div className="relative w-full max-w-md mx-auto">
        <Card className="shadow-2xl shadow-blue-900/10 border border-slate-200/90 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden transition-all duration-300">
          {/* Top Decorative Color Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

          <CardHeader className="text-center space-y-3 pt-7 pb-4 px-6 sm:px-8">
            {/* Logo SMPN 3 Ketapang */}
            <div className="flex items-center justify-center">
              <div className="relative p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-md ring-4 ring-blue-50/60 transition-transform hover:scale-105 duration-300">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
                  className="w-14 h-14 object-contain"
                  alt="Logo SMPN 3 Ketapang"
                />
              </div>
            </div>

            {/* School Tag & Title */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs mb-2">
                <Sparkles className="w-3 h-3 text-blue-600" />
                SMP Negeri 3 Ketapang
              </span>
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Selamat Datang
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Portal Pembelajaran Mandiri Terintegrasi Kurikulum Merdeka
              </CardDescription>
            </div>

            {/* Toggle Tab Satu Pintu (Siswa & Guru) */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl gap-1 border border-slate-200/60 mt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("murid");
                  setError("");
                  setMsg("");
                }}
                className={`py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs font-semibold ${
                  activeTab === "murid"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/60 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Siswa / Murid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("guru");
                  setError("");
                  setMsg("");
                }}
                className={`py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs font-semibold ${
                  activeTab === "guru"
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <School className="w-4 h-4 shrink-0" />
                <span>Guru / Pengajar</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1 pb-7 px-6 sm:px-8">
            {/* Redirect Notice */}
            {location.state?.from && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2.5 font-medium leading-relaxed shadow-xs">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Silakan masuk terlebih dahulu untuk mengakses konten pembelajaran ini.
                </span>
              </div>
            )}

            {/* In-app Browser Notice */}
            {isInAppBrowser && (
              <div className="p-3 bg-amber-50 border border-amber-200/90 text-amber-900 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed shadow-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Jika tombol Google tidak merespon di dalam aplikasi, tekan titik tiga di pojok dan pilih <b>Buka di Chrome/Browser</b>.
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed shadow-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {msg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex gap-2.5 items-start leading-relaxed shadow-xs animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{msg}</span>
              </div>
            )}

            {/* TAB 1: MASUK SISWA DENGAN GOOGLE */}
            {activeTab === "murid" && (
              <div className="space-y-4 pt-1">
                {/* Information Card */}
                <div className="p-3.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-2xl text-xs text-slate-600 leading-relaxed space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Akses Instan & Aman
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Gunakan akun Google aktif Anda. Murid baru akan langsung diarahkan untuk mengisi NISN dan memilih kelas.
                  </p>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-3 bg-white text-slate-800 hover:bg-slate-50 border-2 border-slate-200/80 hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Menghubungkan akun Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110 duration-200" viewBox="0 0 24 24">
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
                      <span>Masuk dengan Google</span>
                      <ArrowRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </>
                  )}
                </button>

                {/* Feature Chips */}
                <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-semibold text-slate-700">Materi</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-semibold text-slate-700">Kuis & Nilai</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                    <Video className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-semibold text-slate-700">Live Meet</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MASUK GURU DENGAN EMAIL/PASSWORD */}
            {activeTab === "guru" && (
              <form onSubmit={handleGuruSubmit} className="space-y-4 pt-1">
                {/* Input Email Guru */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Guru
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-xs sm:text-sm pl-3.5"
                      required
                    />
                  </div>
                </div>

                {/* Input Password */}
                {!isResetMode && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsResetMode(true)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Lupa password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-xs sm:text-sm pl-3.5 pr-11"
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
                      onClick={() => setIsResetMode(false)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Kembali ke Form Login
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </span>
                  ) : isResetMode ? (
                    "Kirim Tautan Reset Password"
                  ) : (
                    "Masuk ke Panel Guru"
                  )}
                </Button>
              </form>
            )}

            {/* Footer Trust Indicator */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Sistem Pembelajaran Terenkripsi & Aman</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
