import React, { useEffect, useState, useContext } from 'react';
import api from '../api/axiosInstance';
import { ShoppingBag, Calendar, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Products = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        if (res.data.success) {
          setProducts(res.data.data);
        } else {
          setError('Failed to fetch products');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleContactSeller = async (sellerId, productId) => {
    try {
      const { data } = await api.post('/messages/init', { sellerId, productId });
      if (data.success) {
        // Redirect to chat with the new chatId
        window.location.href = `/chat?id=${data.data._id}`;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start chat.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[50vh] animate-fade-in text-center px-4 w-full pt-10">
      <h1 className="text-4xl font-black text-teal-400 mb-4 drop-shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-3">
        <ShoppingBag size={36} /> Marketplace
      </h1>
      <p className="text-teal-100 max-w-lg mb-8">
        Explore fixed-price products listed strictly by verified IITP students. More features coming soon!
      </p>

      {loading ? (
        <div className="text-teal-300 text-xl animate-pulse">Loading products...</div>
      ) : error ? (
        <div className="text-red-400 text-lg bg-red-900/20 px-6 py-3 rounded-lg border border-red-500/50">{error}</div>
      ) : products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mt-8">
          <div className="glass-card flex items-center justify-center h-48 bg-[#030a0d] col-span-full border-teal-900/30">
            <span className="opacity-50 text-xl font-medium text-teal-100">No Products Found</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-7xl mt-8 pb-12">
          {products.map((product) => (
            <div key={product._id} className="glass-card overflow-hidden flex flex-col items-start text-left bg-[#050b0f] relative group border-teal-900/30 p-0">
              {/* Image area — flush to all edges at the top */}
              <div className="w-full h-56 relative overflow-hidden rounded-t-xl flex-shrink-0">
                {product.productPic ? (
                  <img src={product.productPic} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-teal-800 bg-[#030a0d]">No Image provided</div>
                )}
                <div className="absolute top-3 right-3 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
                  Verified
                </div>
              </div>

              {/* Card content below image */}
              <div className="p-5 flex flex-col flex-grow w-full">
                <h3 className="text-xl font-bold text-teal-50 mb-2 line-clamp-1" title={product.title}>{product.title}</h3>
                <p className="text-teal-700 font-medium text-sm mb-4 line-clamp-2" title={product.description}>{product.description}</p>

                <div className="mt-auto">
                  <div className="flex items-center text-green-400 font-extrabold text-2xl mb-3 drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]">
                    ₹{product.askingPrice || product.price}
                  </div>

                  <div className="text-xs text-teal-600 flex flex-col gap-1.5 border-t border-teal-900/40 pt-3">
                    {product.seller && (
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-teal-500" />
                        <span>Seller: <span className="text-teal-200 font-bold">{product.seller.name}</span></span>
                      </div>
                    )}
                    {product.buyingDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-teal-500" />
                        <span>Bought: {new Date(product.buyingDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {user && user._id === product.seller._id ? (
                    <button
                      onClick={() => window.location.href = '/profile'}
                      className="w-full mt-5 bg-teal-900/40 text-teal-300 font-black tracking-wide py-2.5 rounded-xl border border-teal-500/20"
                    >
                      Your Listing (Manage)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleContactSeller(product.seller._id, product._id)}
                      className="w-full mt-5 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-[#030a0d] font-black tracking-wide py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:shadow-[0_0_20px_rgba(0,210,255,0.5)] transform hover:-translate-y-0.5"
                    >
                      Contact Seller
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
