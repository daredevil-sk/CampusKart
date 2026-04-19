import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  CheckCircle, XCircle, RefreshCw, Clock, Package,
  Gavel, Edit2, AlertTriangle, User, DollarSign, Trash2
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [pendingProducts, setPendingProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'products');
  const [highlightId, setHighlightId] = useState(location.state?.highlightReportId || null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [banDays, setBanDays] = useState(7);
  const [socket, setSocket] = useState(null);

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report record permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/messages/admin/reports/${reportId}`);
      fetchData();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Delete failed — server connection error.';
      alert(msg);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={48} className="text-red-500" />
        <p className="text-center text-red-500 font-bold text-2xl">Access Denied: Admin Clearance Required.</p>
      </div>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, reportRes] = await Promise.all([
        api.get('/products/admin/pending'),
        api.get('/messages/admin/reports')
      ]);
      setPendingProducts(prodRes.data.data);
      setReports(reportRes.data.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (location.state?.activeTab) setActiveTab(location.state.activeTab);

    const interval = setInterval(fetchData, 60000); // Slower background refresh
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://campuskart-3mzo.onrender.com';
    const newSocket = io(socketUrl);
    setSocket(newSocket);
    newSocket.emit('user_online', user._id);

    newSocket.on('receive_message', (data) => {
      if (data.type === 'system') {
        fetchData(); // Instant refresh when report arrives
      }
    });

    return () => {
      clearInterval(interval);
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // Deep Link & Highlighting Effect
  useEffect(() => {
    if (reports.length > 0 && location.state?.highlightReportId) {
      const targetId = location.state.highlightReportId;
      const matchedReport = reports.find(r => r._id === targetId || r.chat === targetId);

      if (matchedReport) {
        setHighlightId(matchedReport._id);
        setTimeout(() => {
          const element = document.getElementById(`report-${matchedReport._id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400);
      }
    }
  }, [reports, location.state]);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/products/admin/approve/${id}`, { action });
      setPendingProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert(`Failed to ${action} product.`);
    }
  };

  const handleResolveReport = async (id) => {
    try {
      await api.patch(`/messages/admin/reports/${id}/resolve`);
      setReports(prev => prev.map(r => r._id === id ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      alert('Failed to resolve report.');
    }
  };

  const handleUpdateStatus = async (userId, status, days) => {
    try {
      const daysNum = parseInt(days) || 0;
      console.log('🔐 Sending ban request:', { userId, status, days: daysNum });
      const response = await api.patch('/messages/admin/users/status', { userId, status, days: daysNum });
      console.log('✅ Ban successful:', response.data);
      alert(response.data.message || `User status updated to ${status}`);
      fetchData();
    } catch (err) {
      console.error('❌ Ban error details:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        error: err.message,
        url: err.config?.url,
        method: err.config?.method,
        data: err.config?.data
      });
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update user status. (Check console for details)';
      alert(`Error: ${errorMsg}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10 pb-20 animate-fade-in text-teal-50 min-h-[70vh]">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 tracking-tight drop-shadow-[0_0_15px_rgba(0,210,255,0.4)]">
          Admin Moderation Dashboard
        </h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 text-sm text-teal-400 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 px-4 py-2 rounded-xl transition font-bold"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === 'products' ? 'bg-teal-500 text-[#030a0d]' : 'bg-teal-900/20 text-teal-400 border border-teal-900/40 hover:bg-teal-900/40'}`}
        >
          Products ({pendingProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'reports' ? 'bg-rose-500 text-[#030a0d]' : 'bg-rose-900/20 text-rose-400 border border-rose-900/40 hover:bg-rose-900/40'}`}
        >
          Reports ({reports.filter(r => r.status === 'pending').length})
          {reports.some(r => r.status === 'pending') && <span className="w-2 h-2 bg-rose-200 rounded-full animate-ping"></span>}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-8 border-b border-teal-900/40 pb-4">
        <p className="text-teal-100/60 text-sm">
          Review products pending verification. Items re-submitted after edits are marked <span className="text-amber-400 font-bold">EDITED</span>.
        </p>
        <span className="text-[10px] text-teal-700 ml-auto whitespace-nowrap">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: Package, label: 'Pending Review', val: pendingProducts.length, color: 'amber' },
          { icon: AlertTriangle, label: 'Active Reports', val: reports.filter(r => r.status === 'pending').length, color: 'rose' },
          { icon: Gavel, label: 'Auction Listings', val: pendingProducts.filter(p => p.listingType === 'auction').length, color: 'emerald' },
          { icon: DollarSign, label: 'Fixed Listings', val: pendingProducts.filter(p => p.listingType !== 'auction').length, color: 'teal' },
        ].map(s => (
          <div key={s.label} className={`glass-card flex items-center gap-4 py-4 px-6 border-${s.color}-500/20`}>
            <s.icon size={24} className={`text-${s.color}-400`} />
            <div>
              <div className="flex items-baseline gap-1">
                <p className={`text-2xl font-black text-${s.color}-300`}>{s.val}</p>
              </div>
              <p className="text-[10px] text-teal-600 font-bold uppercase">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-72 animate-pulse bg-teal-900/10" />)}
        </div>
      ) : activeTab === 'products' ? (
        pendingProducts.length === 0 ? (
          <div className="glass-card text-center py-16 border-teal-900/20">
            <CheckCircle size={48} className="text-teal-700 mx-auto mb-4" />
            <p className="text-teal-400 font-bold text-lg">All clear! No products waiting for review.</p>
            <p className="text-teal-700 text-sm mt-1">New submissions will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingProducts.map((p) => {
              const isEdited = p.updatedAt && p.createdAt && new Date(p.updatedAt) - new Date(p.createdAt) > 60000;
              return (
                <div key={p._id} className="glass-card p-0 overflow-hidden flex flex-col border-teal-900/30 hover:border-teal-400/30 transition-all duration-300">
                  <div className="relative w-full h-48">
                    {p.productPic ? <img src={p.productPic} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#030a0d] flex items-center justify-center text-teal-800"><Package size={40} /></div>}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">⏳ Pending</span>
                      {isEdited && <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"><Edit2 size={9} /> EDITED</span>}
                    </div>
                    <span className={`absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full border ${p.listingType === 'auction' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-teal-500/20 text-teal-400 border-teal-500/30'}`}>
                      {p.listingType === 'auction' ? '🔨 Auction' : '🏷️ Fixed'}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-xl font-black text-teal-100 mb-1 truncate">{p.title}</h2>
                    <p className="text-xs text-teal-600 italic mb-3 line-clamp-2">"{p.description}"</p>
                    <div className="flex items-center justify-between text-sm mb-4 border-b border-teal-900/20 pb-3">
                      <div className="flex items-center gap-1.5"><User size={13} className="text-teal-500" /><span className="text-teal-400">Seller: <span className="text-teal-100 font-bold">{p.seller?.name}</span></span></div>
                      <span className="font-black text-green-400 text-lg">₹{p.listingType === 'auction' ? p.startingBid : (p.askingPrice || p.price)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button onClick={() => handleAction(p._id, 'approve')} className="flex justify-center items-center gap-2 bg-teal-500/10 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 rounded-xl py-2 font-bold text-xs"><CheckCircle size={16} /> Approve</button>
                      <button onClick={() => handleAction(p._id, 'reject')} className="flex justify-center items-center gap-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl py-2 font-bold text-xs"><XCircle size={16} /> Reject</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* REPORTS TAB */
        reports.length === 0 ? (
          <div className="glass-card text-center py-16 border-teal-900/20">
            <CheckCircle size={48} className="text-teal-700 mx-auto mb-4" />
            <p className="text-teal-400 font-bold text-lg">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...reports]
              .sort((a, b) => {
                // Priority 1: Unseen (Pending & User Active)
                const isAUnseenActive = a.status === 'pending' && a.reportedUser?.status === 'active';
                const isBUnseenActive = b.status === 'pending' && b.reportedUser?.status === 'active';
                if (isAUnseenActive && !isBUnseenActive) return -1;
                if (!isAUnseenActive && isBUnseenActive) return 1;

                // Priority 2: Banned Users (Regardless of report status)
                const isABanned = a.reportedUser?.status === 'banned';
                const isBBanned = b.reportedUser?.status === 'banned';
                if (isABanned && !isBBanned) return -1;
                if (!isABanned && isBBanned) return 1;

                return 0; // Maintain natural (timestamp) order for everything else
              })
              .map((r) => (
                <div
                  key={r._id}
                  id={`report-${r._id}`}
                  className={`glass-card p-6 border-teal-900/30 flex flex-col lg:flex-row gap-8 transition-all ${r.status === 'pending' ? 'ring-1 ring-rose-500/10 shadow-[0_0_20px_rgba(225,29,72,0.05)] border-rose-500/20' : 'border-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.02)]'} ${(highlightId === r._id || highlightId === r.chat) ? 'ring-2 ring-teal-400/50 shadow-[0_0_30px_rgba(45,212,191,0.2)] scale-[1.02] -translate-y-1 z-10' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className={`text-xl font-black ${r.status === 'pending' ? 'text-rose-400' : 'text-emerald-400'}`}>Report #{r._id.slice(-6)}</h3>
                        <p className="text-xs text-teal-600">Issued on {new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'pending' ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {r.status === 'resolved' ? '✅ Resolved' : '⏳ Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-teal-900/20 p-4 rounded-2xl border border-teal-900/40">
                        <p className="text-[10px] font-black text-rose-900 uppercase mb-2 tracking-widest">Reported User (Target)</p>
                        <p className="font-bold text-teal-50 text-base">@{r.reportedUser?.name}</p>
                        <p className="text-xs text-teal-600 mb-2 truncate">{r.reportedUser?.email}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${r.reportedUser?.status === 'active' ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'}`}>
                          Current Status: {r.reportedUser?.status}
                        </span>
                      </div>
                      <div className="bg-teal-900/20 p-4 rounded-2xl border border-teal-900/40">
                        <p className="text-[10px] font-black text-teal-700 uppercase mb-2 tracking-widest">Reporter (Complainant)</p>
                        <p className="font-bold text-teal-50 text-base">@{r.reporter?.name}</p>
                        <p className="text-xs text-teal-600">{r.reporter?.email}</p>
                      </div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-2xl border border-teal-900/20">
                      <p className="text-xs font-bold text-teal-400 underline mb-1">Reason for report:</p>
                      <p className="text-sm text-teal-100">{r.reason}</p>
                    </div>
                  </div>

                  <div className="w-full lg:w-80 flex flex-col gap-4">
                    <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-[2rem] flex flex-col gap-4">
                      <p className="text-xs font-black text-rose-400 uppercase tracking-widest text-center">Admin Privileges</p>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-teal-700 ml-2">Duration (Days)</label>
                        <input type="number" min="1" value={banDays} onChange={(e) => setBanDays(e.target.value)} className="w-full bg-black/40 border-none rounded-xl px-4 py-2 text-sm text-teal-50" />
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(r.reportedUser?._id, 'banned', banDays)}
                        className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${r.reportedUser?.status === 'banned' ? 'bg-teal-500 text-[#030a0d]' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20'}`}
                      >
                        {r.reportedUser?.status === 'banned' ? 'Already Banned' : `Ban for ${banDays} Days`}
                      </button>

                      {r.reportedUser?.status !== 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(r.reportedUser?._id, 'active', 0)}
                          className="w-full py-3 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-500/20 transition-all"
                        >
                          Unban / Activate
                        </button>
                      )}

                      {r.status === 'pending' ? (
                        <button
                          onClick={() => handleResolveReport(r._id)}
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl py-3 px-4 text-xs font-black transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={14} /> Resolve Report
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteReport(r._id)}
                          className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl py-3 px-4 text-xs font-black transition flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> Delete Permanent
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminDashboard;
