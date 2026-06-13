import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import db from "../db.ts";
import { useCommunity } from "./CommunityContext.tsx";
import { isGlobalAdmin as checkGlobalAdmin } from "../../../constants.ts";
import StorageImage from "./StorageImage.tsx";

export default function Layout({ children, headerActions }: { children: ReactNode, headerActions?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = db.useAuth();
  const { activeCommunityCode, setActiveCommunityCode, myProfiles, allCommunities } = useCommunity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when navigating
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const { data: userData } = db.useQuery(
    user?.id
      ? {
          $users: {
            $: { where: { id: user.id } },
            matchesAsUser1: {},
            matchesAsUser2: {},
          },
          communities: activeCommunityCode ? { $: { where: { code: activeCommunityCode } }, creator: {} } : undefined,
        }
      : null
  );

  const hasMatch =
    userData?.$users[0] &&
    ((userData.$users[0].matchesAsUser1?.length ?? 0) > 0 ||
      (userData.$users[0].matchesAsUser2?.length ?? 0) > 0);

  const activeCommunity = userData?.communities?.[0];
  const coverImageUrl = activeCommunity?.coverImageUrl;

  const isGlobalAdmin = checkGlobalAdmin(user?.email);
  let communityAdminEmails: string[] = [];
  try {
    communityAdminEmails = Array.isArray(userData?.communities?.[0]?.adminEmails)
      ? userData!.communities![0].adminEmails
      : [];
  } catch (e) {
    console.error("Failed to parse admin emails", e);
  }
  const isCommunityAdmin = user?.email && communityAdminEmails.some(e => e.toLowerCase() === user.email.toLowerCase());
  const isCreator = user?.id && userData?.communities?.[0]?.creator?.id === user.id;
  const isAdmin = isGlobalAdmin || isCommunityAdmin || isCreator;

  // Let admins see all communities they have access to in the dropdown
  const adminCommunities = allCommunities.filter(c => {
    if (isGlobalAdmin) return true;
    try {
      const admins = Array.isArray(c.adminEmails) ? c.adminEmails : [];
      const isAdminOfComm = user?.email && admins.some((e: string) => e.toLowerCase() === user.email!.toLowerCase());
      const isCreatorOfComm = user?.id && c.creator?.id === user.id;
      return isAdminOfComm || isCreatorOfComm;
    } catch {
      return false;
    }
  });

  const dropdownCommunities = Array.from(new Set([
    ...myProfiles.map(p => p.community?.code).filter(Boolean),
    ...adminCommunities.map(c => c.code)
  ]));

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
      <div className="border-b border-grape-900/50 sticky top-0 bg-[#0f0a1a] z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <span
              onClick={() => navigate("/")}
              className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
            >
              NOFOBO
            </span>
            {(dropdownCommunities.length > 0 || myProfiles.length > 0) && activeCommunityCode && (
              <select
                value={activeCommunityCode}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    navigate("/app/onboarding?new=1");
                  } else {
                    setActiveCommunityCode(e.target.value);
                  }
                }}
                className="bg-grape-900 border border-grape-800 text-grape-300 text-xs sm:text-sm rounded-lg focus:ring-grape-500 focus:border-grape-500 block px-2 py-1 sm:px-2.5 sm:py-1.5 truncate max-w-[140px] sm:max-w-xs"
              >
                {dropdownCommunities.map((code) => (
                  <option key={code} value={code}>
                    /{code}
                  </option>
                ))}
                <option value="new" className="text-grape-500 font-bold border-t border-grape-800">
                  + Add/Join Community
                </option>
              </select>
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
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

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            {headerActions && (
              <div className="flex items-center">
                {headerActions}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-grape-300 hover:text-white p-1"
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-grape-900/50 bg-[#0f0a1a] absolute top-full left-0 w-full shadow-2xl">
            <div className="flex flex-col px-4 py-2">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`text-left py-3 px-2 text-base font-medium transition-colors border-b border-grape-900/30 ${
                    location.pathname === link.path
                      ? "text-white"
                      : "text-grape-400 hover:text-grape-300"
                  }`}
                >
                  {link.name}
                </button>
              ))}
              <button
                onClick={() => db.auth.signOut()}
                className="text-left py-3 px-2 text-base font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Community Cover Banner */}
      {coverImageUrl && (
        <div className="w-full h-32 sm:h-40 relative border-b border-grape-900/50">
          <StorageImage
            pathOrUrl={coverImageUrl}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a1a] to-transparent"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
