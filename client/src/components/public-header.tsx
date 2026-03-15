import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, navigate] = useLocation();

  const navLinks = [
    { href: "/pricing", label: "Pricing" },
    { href: "/auth?mode=login", label: "Sign In" },
  ];

  const isActive = (href: string) => location === href;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center cursor-pointer" data-testid="link-home">
            <span className="text-2xl">
              <span className="font-normal text-gray-900">Backstage</span>
              <span className="font-bold text-gray-900">OS</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navigate(link.href); }}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                data-testid={`link-${link.label.toLowerCase().replace(" ", "-")}`}
              >
                {link.label}
              </a>
            ))}
            <Button size="sm" onClick={() => navigate("/auth?mode=signup")} data-testid="button-create-account">
              Create Account
            </Button>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate(link.href); }}
                  className={`text-sm font-medium px-2 py-2 rounded-md transition-colors cursor-pointer ${
                    isActive(link.href)
                      ? "text-primary bg-primary/5"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <Button className="w-full" size="sm" onClick={() => { setMobileMenuOpen(false); navigate("/auth?mode=signup"); }}>
                Create Account
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
