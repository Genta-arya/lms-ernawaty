import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
          "Gagal masuk dengan akun Google. Silakan coba kembali.",
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
          err.message || "Gagal masuk. Periksa koneksi atau kredensial Anda.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex items-center justify-center  py-12">
      <Card className="w-full  shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex items-center justify-center">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
              className="w-20 h-20 bg-white"
              l
              alt=""
            />
          </div>

          <CardDescription className="text-xs text-muted-foreground">
            SMP Negeri 3 Ketapang - Kurikulum Merdeka
          </CardDescription>

          {/* Toggle Tab Satu Pintu */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mt-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("murid");
                setError("");
                setMsg("");
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "murid"
                  ? "bg-white text-primary shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <GraduationCap className="w-4 h-4" />
              Siswa
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("guru");
                setError("");
                setMsg("");
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "guru"
                  ? "bg-white text-primary shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <School className="w-4 h-4" />
              Guru
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {location.state?.from && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <span>
                Silakan masuk terlebih dahulu untuk mengakses materi
                pembelajaran ini.
              </span>
            </div>
          )}

          {isInAppBrowser && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Jika tombol Google tidak merespon di dalam aplikasi, tekan titik
                tiga di pojok dan pilih <b>Buka di Chrome/Browser</b>.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {msg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}

          {/* TAB 1: MASUK SISWA DENGAN GOOGLE */}
          {activeTab === "murid" && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 leading-relaxed">

                Gunakan akun Google aktif Anda. Jika pertama kali masuk, Anda
                akan diarahkan untuk memilih kelas dan mengisi NISN.
              </div>

              <Button
                type="button"
                className="w-full h-11 text-xs font-bold flex items-center justify-center gap-3 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>
                  {loading ? "Menghubungkan..." : "Lanjutkan dengan Google"}
                </span>
              </Button>
            </div>
          )}

          {/* TAB 2: MASUK GURU DENGAN EMAIL/PASSWORD */}
          {activeTab === "guru" && (
            <form onSubmit={handleGuruSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Email Guru
                </label>
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {!isResetMode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsResetMode(true)}
                      className="text-[11px] text-primary hover:underline"
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
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                    className="text-[11px] text-primary hover:underline"
                  >
                    Kembali ke Form Login
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-xs font-bold"
                disabled={loading}
              >
                {loading
                  ? "Memproses..."
                  : isResetMode
                    ? "Kirim Tautan Reset Password"
                    : "Masuk ke Panel Guru"}
              </Button>
            </form>
          )}

          {/* Bantuan */}
          <div className="pt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              Belum aktivasi? Masuk via Google lalu lengkapi NISN Anda.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
