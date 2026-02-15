import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout() {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex flex-col transition-colors duration-200">
      <Navbar />
      <main id="main-content" className="pt-16 flex-1" role="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
