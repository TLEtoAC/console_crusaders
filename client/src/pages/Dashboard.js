import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  User, 
  ShoppingBag, 
  Repeat2 as Swap, 
  Plus, 
  Settings, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Award
} from 'lucide-react';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [userSwaps, setUserSwaps] = useState([]);
  const [incomingSwaps, setIncomingSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, itemsRes, swapsRes, incomingRes] = await Promise.all([
        axios.get('/api/users/stats'),
        axios.get('/api/users/items'),
        axios.get('/api/users/swaps'),
        axios.get('/api/swaps/my-items')
      ]);
      setUserStats(statsRes.data.stats);
      setUserItems(itemsRes.data.items);
      setUserSwaps(swapsRes.data.swaps);
      setIncomingSwaps(incomingRes.data.swaps.filter(s => s.status === 'pending'));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSwap = async (swapId) => {
    setActionLoading((prev) => ({ ...prev, [swapId]: true }));
    try {
      await axios.put(`/api/swaps/${swapId}/accept`);
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept swap');
    } finally {
      setActionLoading((prev) => ({ ...prev, [swapId]: false }));
    }
  };

  const handleRejectSwap = async (swapId) => {
    setActionLoading((prev) => ({ ...prev, [swapId]: true }));
    try {
      await axios.put(`/api/swaps/${swapId}/reject`);
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject swap');
    } finally {
      setActionLoading((prev) => ({ ...prev, [swapId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'badge-warning', text: 'Pending' },
      approved: { color: 'badge-success', text: 'Approved' },
      rejected: { color: 'badge-gray', text: 'Rejected' },
      available: { color: 'badge-success', text: 'Available' },
      unavailable: { color: 'badge-gray', text: 'Unavailable' }
    };
    
    const config = statusConfig[status] || { color: 'badge-gray', text: status };
    return <span className={`badge ${config.color}`}>{config.text}</span>;
  };

  const getSwapStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'badge-warning', text: 'Pending', icon: Clock },
      accepted: { color: 'badge-success', text: 'Accepted', icon: CheckCircle },
      completed: { color: 'badge-success', text: 'Completed', icon: CheckCircle },
      rejected: { color: 'badge-gray', text: 'Rejected', icon: XCircle }
    };
    
    const config = statusConfig[status] || { color: 'badge-gray', text: status, icon: Clock };
    const Icon = config.icon;
    return (
      <span className={`badge ${config.color} flex items-center`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            Manage your items, track your swaps, and see your impact on sustainable fashion.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Points Balance</p>
                <p className="text-2xl font-bold text-gray-900">{user?.points}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.available_items || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <Swap className="w-6 h-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Swaps</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.completed_swaps || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.pending_requests || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'items', label: 'My Items', icon: ShoppingBag },
              { id: 'swaps', label: 'Swaps', icon: Swap }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Card */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                  <Link to="/settings" className="text-primary-600 hover:text-primary-500">
                    <Settings className="w-5 h-5" />
                  </Link>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Member Since</label>
                    <p className="text-gray-900">
                      {new Date(user?.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {userSwaps.slice(0, 5).map((swap) => (
                    <div key={swap.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Swap className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {swap.swap_type === 'direct_swap' ? 'Direct Swap' : 'Points Redemption'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(swap.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {getSwapStatusBadge(swap.status)}
                    </div>
                  ))}
                  {userSwaps.length === 0 && (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">My Items</h3>
                <Link to="/add-item" className="btn-primary flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add New Item</span>
                </Link>
              </div>

              {userItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userItems.map((item) => (
                    <div key={item.id} className="card-hover">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 mb-4">
                        <img
                          src={item.images?.[0] || '/placeholder-item.jpg'}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                          {getStatusBadge(item.is_approved ? 'approved' : 'pending')}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-primary-600">
                            {item.points_value} pts
                          </span>
                          {getStatusBadge(item.is_available ? 'available' : 'unavailable')}
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            to={`/item/${item.id}`}
                            className="btn-secondary flex-1 text-center text-sm"
                          >
                            View
                          </Link>
                          <Link
                            to={`/edit-item/${item.id}`}
                            className="btn-primary flex-1 text-center text-sm"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start by listing your first item to join the sustainable fashion community!
                  </p>
                  <Link to="/add-item" className="btn-primary">
                    List Your First Item
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Swaps Tab */}
          {activeTab === 'swaps' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Swap History</h3>

              {/* Incoming Swap Requests */}
              {incomingSwaps.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Incoming Swap Requests</h4>
                  <div className="space-y-4">
                    {incomingSwaps.map((swap) => (
                      <div key={swap.id} className="card border-l-4 border-warning-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                              <img
                                src={swap.images?.[0] || '/placeholder-item.jpg'}
                                alt={swap.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{swap.title}</h4>
                              <p className="text-sm text-gray-500">
                                {swap.swap_type === 'direct_swap' ? 'Direct Swap' : 'Points Redemption'}
                                {swap.points_offered && ` - ${swap.points_offered} points`}
                              </p>
                              <p className="text-xs text-gray-400">
                                Requested by {swap.first_name} {swap.last_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              className="btn-success text-sm"
                              disabled={actionLoading[swap.id]}
                              onClick={() => handleAcceptSwap(swap.id)}
                            >
                              {actionLoading[swap.id] ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              className="btn-warning text-sm"
                              disabled={actionLoading[swap.id]}
                              onClick={() => handleRejectSwap(swap.id)}
                            >
                              {actionLoading[swap.id] ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userSwaps.length > 0 ? (
                <div className="space-y-4">
                  {userSwaps.map((swap) => (
                    <div key={swap.id} className="card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={swap.images?.[0] || '/placeholder-item.jpg'}
                              alt={swap.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{swap.title}</h4>
                            <p className="text-sm text-gray-500">
                              {swap.swap_type === 'direct_swap' ? 'Direct Swap' : 'Points Redemption'}
                              {swap.points_offered && ` - ${swap.points_offered} points`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(swap.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {getSwapStatusBadge(swap.status)}
                          <Link
                            to={`/item/${swap.item_id}`}
                            className="btn-secondary text-sm"
                          >
                            View Item
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Swap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No swaps yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start browsing items to make your first swap!
                  </p>
                  <Link to="/browse" className="btn-primary">
                    Browse Items
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 