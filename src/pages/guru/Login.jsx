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
import { ShieldCheck, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

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
          err.message || "Gagal masuk. Periksa koneksi atau kredensial Anda.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 text-primary w-12 h-12 rounded-full flex items-center justify-center mb-1">
        
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Login Guru Pengampu
          </CardTitle>
          <CardDescription className="text-sm">
            Masuk untuk mengelola materi, kuis, kelas, dan memantau progres
            belajar siswa SMPN 3 Ketapang.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {msg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{msg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Guru
              </label>
              <Input
                type="email"
                placeholder="nama@guru.smpn3ketapang.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isResetMode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Memproses..."
                : isResetMode
                  ? "Kirim Email Reset Password"
                  : "Masuk Sebagai Guru"}
            </Button>

            {isResetMode && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => {
                  setIsResetMode(false);
                  setError("");
                  setMsg("");
                }}
              >
                Kembali ke Form Login
              </Button>
            )}
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4 text-center">
          <Link
            to="/masuk"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Anda siswa/murid? Masuk lewat Google di sini
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
