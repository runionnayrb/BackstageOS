import { Link } from "wouter";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-500">
            {currentYear} BackstageOS. All rights reserved.
          </div>
          
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
{/* HIDDEN FOR NOW - Unhide when ready to go public
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="footer-link-pricing"
            >
              Pricing
            </Link>
            */}
            <Link
              href="/auth?mode=login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="footer-link-sign-in"
            >
              Sign In
            </Link>
            <Link
              href="/auth?mode=signup"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="footer-link-create-account"
            >
              Create Account
            </Link>
            <Link
              href="/terms"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="footer-link-terms"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="footer-link-privacy"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
