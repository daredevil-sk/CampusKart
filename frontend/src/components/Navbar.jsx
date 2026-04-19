import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShoppingCart, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-full flex justify-center sticky top-4 z-50 px-4 pointer-events-none">
      <nav className="w-full max-w-6xl pointer-events-auto bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-full flex justify-between items-center px-4 md:px-6 py-3 shadow-md transition-all">
        {/* Left side: Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 transition-all hover:opacity-80 ml-2">
            <ShoppingCart size={24} className="text-white" />
            <span className="hidden sm:inline">CampusKart</span>
          </Link>
        </div>

        {/* Right side: Authenticated Links or Auth Buttons */}
        <div className="flex items-center gap-5">
          {!user && null}

          {user && (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className={`transition-all px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide border ${isActive('/admin') ? 'bg-zinc-200 text-black border-zinc-200' : 'text-zinc-300 border-transparent hover:bg-zinc-800'}`}>
                  Admin Panel
                </Link>
              )}
              <Link to="/sell" className={`transition-all px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide border ${isActive('/sell') ? 'bg-white text-black border-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-transparent'}`}>
                Sell
              </Link>
              <Link to="/products" className={`transition-all px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide border ${isActive('/products') ? 'bg-white text-black border-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-transparent'}`}>
                Marketplace
              </Link>
              <Link to="/auctions" className={`transition-all px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide border ${location.pathname.startsWith('/auction') ? 'bg-white text-black border-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-transparent'}`}>
                Auctions
              </Link>
              <Link to="/chat" className={`transition-all px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide border ${isActive('/chat') ? 'bg-white text-black border-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-transparent'}`}>
                Chat
              </Link>
              <div className="w-px h-6 bg-zinc-700 mx-1"></div>
              <Link to="/profile" className={`flex items-center gap-2 transition-all px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold border ${isActive('/profile') ? 'bg-white text-black border-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-transparent'}`}>
                <User size={18} />
                <span className="hidden lg:inline">Profile</span>
              </Link>
              <button onClick={handleLogout} className="ml-1 flex items-center gap-2 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent rounded-full px-3 py-2 text-xs md:text-sm font-bold transition-all">
                <LogOut size={16} />
                <span className="hidden lg:inline">Log out</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
