import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../../../imgs/logo_no_bg.png';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer bg-white border-t border-[#E5E5E5] py-12 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-[#555555] text-xs font-semibold tracking-widest uppercase gap-6">
      <div className="footer-brand flex items-center gap-3.5">
        <img src={logoImg} alt="FileNotFound Logo" className="footer-logo h-9 w-9 md:h-10 md:w-10 object-contain" />
        <span className="footer-brand-name text-[#111111] font-bold normal-case">FileNotFound</span>
        <span className="footer-separator text-[#E5E5E5]">|</span>
        <span className="footer-copy">© {new Date().getFullYear()} ALL RIGHTS RESERVED</span>
      </div>

      <div className="footer-links flex flex-wrap items-center gap-6 text-[10px] tracking-[0.2em]">
        <Link to="/privacy" className="hover:text-[#111111] transition-colors">
          PRIVACY
        </Link>
        <Link to="/terms" className="hover:text-[#111111] transition-colors">
          TERMS
        </Link>
      </div>

      <div className="footer-tagline text-[10px] tracking-widest text-[#999999]">
        ZERO-TRUST TEMPORARY FILE TRANSFER
      </div>
    </footer>
  );
};
