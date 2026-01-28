import { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  PieChart,
  LogOut,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({
  children,
  currentPage,
  onNavigate,
}: LayoutProps) {
  const { signOut } = useAuth();

  const navItems = [
    {
      id: "clients",
      label: "Clients",
      icon: Users,
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "debts",
      label: "Debts",
      icon: AlertCircle,
      color: "from-red-500 to-pink-600",
    },
    {
      id: "reports",
      label: "Reports",
      icon: PieChart,
      color: "from-purple-500 to-pink-600",
    },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-zinc-100 pb-20 md:pb-0">
      {/* Desktop & Tablet Top Navigation */}
      <nav className="hidden md:block bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center h-16">
            {/* Dinix Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Dinix
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">
                  Client Management System
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all transform ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105`
                        : "text-gray-700 hover:bg-gray-100 hover:scale-105"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all ml-2 hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar - Minimal */}
      <div className="md:hidden bg-white/80 backdrop-blur-xl shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg shadow-md">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Dinix
              </h1>
              <p className="text-xs text-gray-600 -mt-0.5">Client Management</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all active:scale-95"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gradient-to-r from-white/60 via-teal-50 to-white/60 backdrop-blur-xl mt-12 shadow-inner">
        <div className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 md:px-8 xl:px-14 py-8 flex items-center justify-center">
          <a
            href="https://lenzro.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-base font-medium text-gray-700 hover:text-teal-700 transition-colors duration-200"
          >
            <span className="relative flex items-center">
              <svg
                className="w-5 h-5 mr-1 opacity-80 group-hover:scale-110 group-hover:rotate-6 transition-all"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 2 L14.09 8.26 L20.97 8.27 L15.45 12.14 L17.55 18.4 L12 14.53 L6.45 18.4 L8.55 12.14 L3.03 8.27 L9.91 8.26 Z"
                  fill="url(#grad1)"
                />
                <defs>
                  <linearGradient
                    id="grad1"
                    x1="3"
                    x2="21"
                    y1="12"
                    y2="12"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#10b981" />
                    <stop offset="1" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              <span>Developed by</span>
            </span>
            <span className="font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-500 text-transparent bg-clip-text transition-all duration-300">
              Lenzro
            </span>
          </a>
        </div>
      </footer>

      {/* Mobile Bottom Navigation - App Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-2xl z-50">
        <div className="safe-area-inset-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all transform active:scale-95 min-w-[60px] ${
                    isActive ? "scale-105" : "scale-100"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                        : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold transition-colors ${
                      isActive
                        ? "bg-gradient-to-r " +
                          item.color +
                          " bg-clip-text text-transparent"
                        : "text-gray-600"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
