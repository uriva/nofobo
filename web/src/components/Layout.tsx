import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import db from "../db.ts";
import { useCommunity } from "./CommunityContext.tsx";

const ADMIN_EMAILS = ["uri.valevski@gmail.com", "BurningMan@alumni.stanford.edu"];

export default function Layout({ children, headerActions }: { children: ReactNode, headerActions?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = db.useAuth();
  const { activeCommunityCode, setActiveCommunityCode, myProfiles } = useCommunity();

  const { data: userData } = db.useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
            matchesAsUser1: {},
            matchesAsUser2: {},
          },
        }
      : null
  );

  const hasMatch =
    userData?.$users[0] &&
    ((userData.$users[0].matchesAsUser1?.length ?? 0) > 0 ||
      (userData.$users[0].matchesAsUser2?.length ?? 0) > 0);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const navLinks = [
    { name: "Compare", path: "/app/compare" },
    { name: "Decisions", path: "/app/decisions" },
    { name: "Profile", path: "/app/profile" },
  ];

  if (hasMatch) {
    // Insert Match before Profile
    navLinks.splice(2, 0, { name: "Match", path: "/app/match" });
  }

  if (isAdmin) {
    navLinks.push({ name: "Admin", path: "/app/admin" });
  }

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4 sticky top-0 bg-[#0f0a1a] z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              onClick={() => navigate("/app/compare")}
              className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
            >
              NOFOBO
            </span>
            {myProfiles.length > 0 && activeCommunityCode && (
              <select
                value={activeCommunityCode}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    navigate("/app/onboarding?new=1");
                  } else {
                    setActiveCommunityCode(e.target.value);
                  }
                }}
                className="bg-grape-900 border border-grape-800 text-grape-300 text-sm rounded-lg focus:ring-grape-500 focus:border-grape-500 block px-2.5 py-1.5"
              >
                {myProfiles.map((p) => (
                  <option key={p.communityCode} value={p.communityCode}>
                    {p.communityCode}
                  </option>
                ))}
                <option value="new">+ Join/Create new community</option>
              </select>
            )}
          </div>
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
