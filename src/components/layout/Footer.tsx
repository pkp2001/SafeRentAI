import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-dark-900 text-dark-300 dark:bg-dark-900 dark:border-t dark:border-dark-800" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                SafeRent<span className="text-primary-400">AI</span>
              </span>
            </Link>
            <p className="text-sm text-dark-400 leading-relaxed">
              AI-powered scam detection and automated rental applications for vulnerable Australians.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/search" className="text-sm hover:text-white transition-colors">
                  Search Listings
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-sm hover:text-white transition-colors">
                  Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/resources" className="text-sm hover:text-white transition-colors">
                  Help Centre
                </Link>
              </li>
              <li>
                <a href="mailto:support@saferent.ai" className="text-sm hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <Link to="/resources" className="text-sm hover:text-white transition-colors">
                  Report a Scam
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm cursor-pointer hover:text-white transition-colors">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-sm cursor-pointer hover:text-white transition-colors">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="text-sm cursor-pointer hover:text-white transition-colors">
                  Cookie Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-dark-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-dark-500">
            © {new Date().getFullYear()} SafeRent AI. All rights reserved.
          </p>
          <p className="text-xs text-dark-500">
            Made with ❤️ for Australian renters
          </p>
        </div>
      </div>
    </footer>
  );
}
