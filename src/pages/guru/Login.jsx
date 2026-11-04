import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  School,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  Sparkles,
  GraduationCap,
} from "lucide-react";

export function Login() {
  const { loginGuru, resetPassword, currentUser, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Jika sudah login guru
  if (currentUser && role === "guru") {
    navigate("/guru", { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);

    try {
      if (isResetMode) {
        await resetPassword(email);
        setMsg("Tautan reset password telah dikirim ke email Anda.");
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
        setError("Email atau password guru tidak sesuai.");
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
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
      {/* Decorative Ambient Background Elements */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <div className="relative w-full max-w-md mx-auto">
        <Card className="shadow-2xl shadow-indigo-900/10 border border-slate-200/90 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden transition-all duration-300">
          {/* Top Decorative Color Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500" />

          <CardHeader className="text-center space-y-3 pt-7 pb-4 px-6 sm:px-8">
            {/* Logo SMPN 3 Ketapang & Icon Guru */}
            <div className="flex items-center justify-center">
              <div className="relative p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-md ring-4 ring-indigo-50/60 transition-transform hover:scale-105 duration-300">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
                  className="w-14 h-14 object-contain"
                  alt="Logo SMPN 3 Ketapang"
                />
              </div>
            </div>

            {/* Header Titles */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs mb-2">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                Portal Guru & Pengampu
              </span>
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                Login Pendidik
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Kelola bahan ajar, penugasan, kuis interaktif, dan pantau perkembangan belajar siswa.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1 pb-4 px-6 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Input Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Guru
                </label>
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-xs sm:text-sm pl-3.5"
                  required
                />
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
                      onClick={() => {
                        setIsResetMode(true);
                        setError("");
                        setMsg("");
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
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

              {/* Reset Password Toggle Notice */}
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
                    Kembali ke Form Login
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </span>
                ) : isResetMode ? (
                  "Kirim Email Reset Password"
                ) : (
                  "Masuk Sebagai Guru"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pt-4 pb-6 px-6 sm:px-8 text-center bg-slate-50/50">
            <Link
              to="/masuk"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>Bukan guru? Masuk sebagai Siswa di sini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SMP Negeri 3 Ketapang LMS Portal</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
