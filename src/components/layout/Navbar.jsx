import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { currentUser, role, profileData, logout, isInAppBrowser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      {isInAppBrowser && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs text-center font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Anda membuka dari in-app browser. Buka di <b>Chrome</b> atau{" "}
            <b>Safari</b> untuk pengalaman terbaik.
          </span>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 shadow-xs">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* SISI KIRI: Logo Brand */}
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-white rounded-xl p-1 border border-slate-200 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <img
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
                  alt="Logo SMPN 3 Ketapang"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-none">
                  SMPN 3 Ketapang
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Learning Management System
                </span>
              </div>
            </Link>
          </div>

          {/* SISI TENGAH: Navigasi Desktop (Hanya muncul jika sudah login) */}
          {currentUser && (
            <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-2 text-xs font-semibold">
              <Link
                to="/"
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all",
                  pathname === "/"
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                )}
              >
                Beranda
              </Link>

              {role === "guru" && (
                <>
                  <Link
                    to="/guru"
                    className={cn(
                      "px-3.5 py-1.5 rounded-full transition-all",
                      pathname === "/guru" || pathname === "/guru/"
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    Dashboard Guru
                  </Link>
                  <Link
                    to="/guru/profil"
                    className={cn(
                      "px-3.5 py-1.5 rounded-full transition-all",
                      pathname.startsWith("/guru/profil")
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    Profil
                  </Link>
                </>
              )}

              <Link
                to={role === "guru" ? "/guru/mading" : "/murid/mading"}
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all",
                  pathname.includes("/mading")
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                )}
              >
                Kreasi
              </Link>

              {role === "murid" && (
                <>
                  <Link
                    to="/murid"
                    className={cn(
                      "px-3.5 py-1.5 rounded-full transition-all",
                      pathname === "/murid" ||
                        pathname.startsWith("/murid/kuis") ||
                        pathname.startsWith("/murid/hasil")
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    Materi
                  </Link>
                  <Link
                    to="/murid/riwayat"
                    className={cn(
                      "px-3.5 py-1.5 rounded-full transition-all",
                      pathname.startsWith("/murid/riwayat")
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    Riwayat Kuis
                  </Link>
                  <Link
                    to="/murid/profil"
                    className={cn(
                      "px-3.5 py-1.5 rounded-full transition-all",
                      pathname.startsWith("/murid/profil")
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    Profil
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* SISI KANAN: Tombol Logout / Masuk Portal */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari Akun"
                aria-label="Keluar"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors text-xs font-semibold"
              >
                <LogOut className="w-4 h-4 stroke-[2]" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            ) : (
              <Button
                size="sm"
                asChild
                className="rounded-md hover:bg-blue-500 bg-blue-600 font-bold text-xs px-4 h-9 shadow-xs"
              >
                <Link to="/masuk">Masuk</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
