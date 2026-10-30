import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../../../imgs/logo_no_bg.png';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Security', href: '/security' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ];

  const scrollToUpload = () => {
    if (location.pathname === '/') {
      const el = document.getElementById('upload-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
  };

  return (
    <nav className="bg-white border-b border-[#E5E5E5] sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="flex justify-between items-center h-[72px] md:h-[88px]">
          {/* Brand */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex-shrink-0 flex items-center gap-3.5 text-xl md:text-2xl font-bold tracking-tight text-[#111111] uppercase group"
            >
              <img
                src={logoImg}
                alt="FileNotFound Logo"
                className="h-10 w-10 md:h-12 md:w-12 object-contain transition-transform group-hover:scale-105"
              />
              <span>FileNotFound</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:ml-16 md:flex md:space-x-12">
              {navLinks.map((link) => {
                const isAnchor = link.href.startsWith('/#');
                const isActive =
                  !isAnchor && location.pathname === link.href;

                if (isAnchor && location.pathname === '/') {
                  return (
                    <a
                      key={link.name}
                      href={link.href.replace('/', '')}
                      className="text-[#555555] hover:text-[#111111] font-medium text-xs tracking-widest uppercase transition-colors"
                    >
                      {link.name}
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`${
                      isActive
                        ? 'text-[#111111] font-semibold'
                        : 'text-[#555555] hover:text-[#111111] font-medium'
                    } text-xs tracking-widest uppercase transition-colors`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Action */}
          <div className="hidden md:flex md:items-center">
            {location.pathname === '/' ? (
              <button
                type="button"
                onClick={scrollToUpload}
                className="bg-[#111111] text-white px-8 py-3.5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors border border-[#111111] rounded-none"
              >
                SHARE A FILE
              </button>
            ) : (
              <Link
                to="/"
                className="bg-[#111111] text-white px-8 py-3.5 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors border border-[#111111] rounded-none"
              >
                SHARE A FILE
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 text-[#111111] hover:bg-[#F7F7F5] rounded-none focus:outline-none transition-colors"
              aria-label="Open main menu"
            >
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E5E5] bg-white absolute w-full shadow-2xl z-50">
          <div className="pt-4 pb-6 space-y-4 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="block text-[#555555] hover:text-[#111111] font-semibold text-xs tracking-widest uppercase transition-colors py-2 border-b border-[#F7F7F5]"
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-2 flex flex-col gap-3">
              <Link
                to="/"
                className="w-full text-center bg-[#111111] text-white py-4 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#333333] transition-colors border border-[#111111] rounded-none"
              >
                SHARE A FILE
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
