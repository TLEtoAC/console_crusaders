import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const ItemDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [myItems, setMyItems] = useState([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register: swapRegister,
    handleSubmit: handleSwapSubmit,
    reset: resetSwap,
    formState: { errors: swapErrors }
  } = useForm();
  const {
    register: pointsRegister,
    handleSubmit: handlePointsSubmit,
    reset: resetPoints,
    formState: { errors: pointsErrors }
  } = useForm();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/items/${id}`);
        setItem(res.data.item);
      } catch (err) {
        setError('Item not found or server error');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  // Fetch user's available items for swap
  useEffect(() => {
    const fetchMyItems = async () => {
      if (isAuthenticated && item && user && item.user_id !== user.id) {
        try {
          const res = await axios.get('/api/users/items?status=available');
          setMyItems(res.data.items.filter(i => i.id !== item.id));
        } catch (e) {
          setMyItems([]);
        }
      }
    };
    fetchMyItems();
    // eslint-disable-next-line
  }, [isAuthenticated, item, user]);

  const handleSwapRequest = async (data) => {
    setSwapLoading(true);
    try {
      const payload = {
        itemId: item.id,
        swapType: 'direct_swap',
        offeredItemId: data.offeredItemId,
        message: data.message || ''
      };
      await axios.post('/api/swaps', payload);
      toast.success('Swap request sent!');
      setShowSwapModal(false);
      resetSwap();
      navigate('/dashboard?tab=swaps');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send swap request');
    } finally {
      setSwapLoading(false);
    }
  };

  const handlePointsRequest = async (data) => {
    setPointsLoading(true);
    try {
      const payload = {
        itemId: item.id,
        swapType: 'points_redemption',
        pointsOffered: data.pointsOffered,
        message: data.message || ''
      };
      await axios.post('/api/swaps', payload);
      toast.success('Redemption request sent!');
      setShowPointsModal(false);
      resetPoints();
      navigate('/dashboard?tab=swaps');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send redemption request');
    } finally {
      setPointsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{error}</p>
          <Link to="/browse" className="btn-primary">Back to Browse</Link>
        </div>
      </div>
    );
  }

  const isOwner = isAuthenticated && user && item.user_id === user.id;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            {item.images && item.images.length > 0 ? (
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-72 object-cover rounded-lg mb-4"
              />
            ) : (
              <img
                src="/placeholder-item.jpg"
                alt="No preview"
                className="w-full h-72 object-cover rounded-lg mb-4"
              />
            )}
            {item.images && item.images.length > 1 && (
              <div className="flex space-x-2 mt-2">
                {item.images.slice(1).map((src, idx) => (
                  <img key={idx} src={src} alt="preview" className="w-16 h-16 object-cover rounded" />
                ))}
              </div>
            )}
          </div>
          {/* Details */}
          <div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">{item.title}</h2>
            <p className="text-gray-600 mb-4">{item.description}</p>
            <div className="mb-4">
              <span className="badge badge-primary mr-2">{item.category}</span>
              <span className="badge badge-gray mr-2">{item.type}</span>
              <span className="badge badge-gray mr-2">{item.size}</span>
              <span className="badge badge-gray mr-2">{item.condition}</span>
            </div>
            <div className="mb-4">
              <span className="badge badge-success mr-2">{item.points_value} pts</span>
              {item.tags && item.tags.length > 0 && (
                <span className="badge badge-gray">{item.tags.join(', ')}</span>
              )}
            </div>
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-1">Listed by</h4>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600">
                  {item.first_name?.[0]}{item.last_name?.[0]}
                </div>
                <span className="text-gray-900 font-medium">{item.first_name} {item.last_name}</span>
                <span className="text-gray-500 text-sm">({item.email})</span>
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <Link to="/browse" className="btn-secondary">Back to Browse</Link>
              {/* Swap/Points buttons for non-owners */}
              {isAuthenticated && !isOwner && (
                <>
                  <button
                    className="btn-primary"
                    onClick={() => setShowSwapModal(true)}
                  >
                    Swap
                  </button>
                  <button
                    className="btn-success"
                    onClick={() => setShowPointsModal(true)}
                  >
                    Redeem with Points
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowSwapModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Request Swap</h3>
            <form onSubmit={handleSwapSubmit(handleSwapRequest)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select one of your items to offer</label>
                <select {...swapRegister('offeredItemId', { required: 'Please select an item to offer' })} className="input-field mt-1">
                  <option value="">Select item</option>
                  {myItems.map((myItem) => (
                    <option key={myItem.id} value={myItem.id}>{myItem.title} ({myItem.category}, {myItem.size})</option>
                  ))}
                </select>
                {swapErrors.offeredItemId && <p className="text-red-500 text-xs mt-1">{swapErrors.offeredItemId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message (optional)</label>
                <textarea {...swapRegister('message')} className="input-field mt-1" placeholder="Add a message..." rows={2} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={swapLoading}>
                {swapLoading ? 'Sending...' : 'Send Swap Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowPointsModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Redeem with Points</h3>
            <form onSubmit={handlePointsSubmit(handlePointsRequest)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Points to Offer</label>
                <input
                  type="number"
                  {...pointsRegister('pointsOffered', {
                    required: 'Points are required',
                    min: { value: item.points_value, message: `Must offer at least ${item.points_value} points` },
                    max: { value: user?.points || 0, message: 'Not enough points' }
                  })}
                  className="input-field mt-1"
                  placeholder={`At least ${item.points_value}`}
                  min={item.points_value}
                  max={user?.points || 0}
                />
                {pointsErrors.pointsOffered && <p className="text-red-500 text-xs mt-1">{pointsErrors.pointsOffered.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message (optional)</label>
                <textarea {...pointsRegister('message')} className="input-field mt-1" placeholder="Add a message..." rows={2} />
              </div>
              <button type="submit" className="btn-success w-full" disabled={pointsLoading}>
                {pointsLoading ? 'Sending...' : 'Send Redemption Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetail; 