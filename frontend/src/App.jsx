import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './components/Login';
import SellProduct from './components/SellProduct';
import AdminDashboard from './components/AdminDashboard';
import Chat from './components/Chat';

import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null; // or a spinner
  return user ? children : <Navigate to="/login" replace />;
};

const RootRedirect = () => {
  const { user } = useContext(AuthContext);
  return user ? <Navigate to="/products" replace /> : <Navigate to="/login" replace />;
};

import Products from './components/Products';
import Auctions from './components/Auctions';
import AuctionRoom from './components/AuctionRoom';
import Profile from './components/Profile';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-transparent">


          <Navbar />

          <main className="flex-grow z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/auctions" element={<ProtectedRoute><Auctions /></ProtectedRoute>} />
              <Route path="/auction/bidding" element={<ProtectedRoute><AuctionRoom /></ProtectedRoute>} />
              <Route path="/sell" element={<ProtectedRoute><SellProduct /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
