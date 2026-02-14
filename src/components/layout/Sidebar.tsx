import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  FileText,
  User,
  BookOpen,
  Shield,
} from "lucide-react";

const sidebarLinks = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/search", label: "Search Listings", icon: Search },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/resources", label: "Resources", icon: BookOpen },
];

export function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-dark-200 bg-white h-screen fixed left-0 top-0 pt-16">
      <div className="flex-1 py-6 px-4 space-y-1">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(link.path)
                  ? "bg-primary-50 text-primary-600 shadow-sm"
                  : "text-dark-600 hover:bg-dark-50 hover:text-dark-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-dark-200">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50">
          <Shield className="w-5 h-5 text-primary-500" />
          <div>
            <p className="text-xs font-semibold text-primary-700">SafeRent AI</p>
            <p className="text-xs text-primary-500">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

