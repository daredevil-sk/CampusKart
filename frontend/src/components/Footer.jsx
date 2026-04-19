import React from 'react';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  // Show footer on all pages

  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-800 py-10 flex flex-col items-center justify-center text-zinc-500 text-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center">
        <p className="font-black text-white uppercase tracking-[0.2em] text-[10px] opacity-80">
          Developed by
          <span className="text-white ml-2">Team</span>
        </p>
        <span className="w-1 h-1 rounded-full bg-zinc-600 hidden md:block"></span>
        <p className="tracking-widest font-bold uppercase text-[10px] text-zinc-400">IIT Patna</p>
      </div>

      <p className="opacity-40 text-[9px] font-black uppercase tracking-widest text-center text-white">
        &copy; {new Date().getFullYear()} CampusKart &bull; Exclusive Marketplace
      </p>
    </footer>
  );
};

export default Footer;
