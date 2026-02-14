import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/shared/ScrollToTop";

// Lazy load pages
const Home = lazy(() => import("@/pages/Home"));
const Search = lazy(() => import("@/pages/Search"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Apply = lazy(() => import("@/pages/Apply"));
const Profile = lazy(() => import("@/pages/Profile"));
const Resources = lazy(() => import("@/pages/Resources"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
        <p className="text-sm text-dark-400 dark:text-dark-500">Loading...</p>
      </div>
    </div>
  );
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <>
    <a href="#main-content" className="skip-to-content">
      Skip to main content
    </a>
    <ScrollToTop />
    <Suspense fallback={<LoadingFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes without layout */}
          <Route
            path="/login"
            element={
              <AnimatedPage>
                <Login />
              </AnimatedPage>
            }
          />
          <Route
            path="/signup"
            element={
              <AnimatedPage>
                <Signup />
              </AnimatedPage>
            }
          />

          {/* Routes with layout */}
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <AnimatedPage>
                  <Home />
                </AnimatedPage>
              }
            />
            <Route
              path="/search"
              element={
                <AnimatedPage>
                  <Search />
                </AnimatedPage>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <Dashboard />
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/apply/:listingId?"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <Apply />
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <Profile />
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <AnimatedPage>
                  <Resources />
                </AnimatedPage>
              }
            />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
    </>
  );
}
