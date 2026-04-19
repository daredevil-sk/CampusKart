import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { Gavel, Clock, Trophy } from 'lucide-react';

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const res = await api.get('/products/auctions');
        if (res.data.success) {
          setAuctions(res.data.data);
        }
      } catch (err) {
        setError('Failed to fetch auctions');
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  const calculateTimeLeft = (endTime) => {
    const difference = +new Date(endTime) - +new Date();
    if (difference <= 0) return 'Ended';
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    return `${hours}h ${minutes}m left`;
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] animate-fade-in text-center px-4 w-full pt-10">
      <h1 className="text-4xl font-black text-teal-400 mb-4 drop-shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-3">
        <Gavel size={36} /> Live Auctions
      </h1>
      <p className="text-teal-100 max-w-lg mb-10">
        Bid in real-time on verified IITP listings. May the highest bidder win!
      </p>

      {loading ? (
        <div className="text-teal-300 text-xl animate-pulse">Scanning the block...</div>
      ) : auctions.length === 0 ? (
        <div className="glass-card w-full max-w-2xl h-64 flex items-center justify-center">
          <p className="opacity-40 text-xl font-bold text-teal-100">No active auctions at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl animate-fade-in pb-20">
          {auctions.map((auc) => (
            <div key={auc._id} className="glass-card p-0 overflow-hidden flex flex-col group border-teal-500/10 hover:border-teal-400/40 relative">

              {/* Image Area */}
              <div className="h-48 w-full relative">
                {auc.productPic ? (
                  <img src={auc.productPic} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={auc.title} />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-teal-900">No Image</div>
                )}
                <div className="absolute top-4 left-4 bg-rose-500/90 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
                  <Clock size={12} /> {calculateTimeLeft(auc.auctionEndTime)}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col items-start flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{auc.title}</h3>
                <p className="text-zinc-500 text-xs font-medium mb-6 line-clamp-2 text-left">{auc.description}</p>

                <div className="mt-auto w-full flex items-end justify-between border-t border-teal-900/30 pt-4">
                  <div>
                    <span className="text-[10px] text-teal-500 uppercase font-black block mb-1">Current Highest Bid</span>
                    <div className="text-2xl font-black text-green-400 flex items-baseline gap-1">
                      ₹{auc.currentHighestBid || auc.startingBid}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-teal-500 uppercase font-black block mb-1">Starting Bid</span>
                    <span className="text-sm font-bold text-teal-200">₹{auc.startingBid}</span>
                  </div>
                </div>

                <button
                  onClick={() => window.location.href = `/auction/bidding?id=${auc._id}`}
                  className="w-full mt-6 bg-teal-500 text-[#030a0d] py-3 rounded-xl font-black text-sm hover:bg-teal-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                  <Trophy size={18} /> Place Your Bid
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Auctions;
