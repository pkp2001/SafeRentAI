import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main id="main-content" className="pt-16 flex-1" role="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

