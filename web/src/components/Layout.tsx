import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import db from "../db.ts";

const ADMIN_EMAILS = ["uri.valevski@gmail.com", "BurningMan@alumni.stanford.edu"];

export default function Layout({ children, headerActions }: { children: ReactNode, headerActions?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = db.useAuth();

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const navLinks = [
    { name: "Compare", path: "/app/compare" },
    { name: "Decisions", path: "/app/decisions" },
    { name: "Match", path: "/app/match" },
    { name: "Profile", path: "/app/profile" },
  ];

  if (isAdmin) {
    navLinks.push({ name: "Admin", path: "/app/admin" });
  }

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4 sticky top-0 bg-[#0f0a1a] z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span
            onClick={() => navigate("/app/compare")}
            className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
          >
            NOFOBO
          </span>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  location.pathname === link.path
                    ? "text-white"
                    : "text-grape-400 hover:text-grape-300"
                }`}
              >
                {link.name}
              </button>
            ))}
            
            {headerActions && (
              <div className="flex items-center gap-4 border-l border-grape-800 pl-4">
                {headerActions}
              </div>
            )}

            <button
              onClick={() => db.auth.signOut()}
              className={`text-grape-600 hover:text-grape-400 text-sm transition-colors whitespace-nowrap ${!headerActions ? 'border-l border-grape-800 pl-4' : ''}`}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
