import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Menu,
  X,
  Search,
  LayoutDashboard,
  FileText,
  User,
  BookOpen,
  LogOut,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const navLinks = [
  { path: "/", label: "Home", icon: Shield },
  { path: "/search", label: "Search", icon: Search },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/resources", label: "Resources", icon: BookOpen },
];

const authLinks = [
  { path: "/profile", label: "Profile", icon: User },
  { path: "/dashboard", label: "Applications", icon: FileText },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-dark-200/50 dark:bg-dark-900/80 dark:border-dark-700/50 transition-colors" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-shadow">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-dark-900 dark:text-white">
                SafeRent<span className="text-primary-500">AI</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                      : "text-dark-600 hover:text-dark-900 hover:bg-dark-50 dark:text-dark-400 dark:hover:text-dark-200 dark:hover:bg-dark-800"
                  }`}
                  aria-current={isActive(link.path) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile" aria-label="View profile">
                    <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all">
                      <AvatarFallback className="text-xs">
                        {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                    Sign In
                  </Button>
                  <Button size="sm" onClick={() => navigate("/signup")}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                className="p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-5 h-5 dark:text-dark-200" /> : <Menu className="w-5 h-5 dark:text-dark-200" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-white dark:bg-dark-800 shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-200 dark:border-dark-700">
                <span className="font-bold text-lg dark:text-white">Menu</span>
                <button
                  className="p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 dark:text-dark-200" />
                </button>
              </div>
              <div className="p-4 space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.path)
                          ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                          : "text-dark-600 hover:bg-dark-50 dark:text-dark-400 dark:hover:bg-dark-700"
                      }`}
                      aria-current={isActive(link.path) ? "page" : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
                {user &&
                  authLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive(link.path)
                            ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                            : "text-dark-600 hover:bg-dark-50 dark:text-dark-400 dark:hover:bg-dark-700"
                        }`}
                        aria-current={isActive(link.path) ? "page" : undefined}
                      >
                        <Icon className="w-5 h-5" />
                        {link.label}
                      </Link>
                    );
                  })}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-200 dark:border-dark-700">
                {user ? (
                  <Button variant="outline" className="w-full" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        navigate("/login");
                        setMobileOpen(false);
                      }}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
