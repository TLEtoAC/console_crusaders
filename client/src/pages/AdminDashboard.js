import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/items/pending');
      setPendingItems(res.data.items);
    } catch (err) {
      toast.error('Failed to fetch pending items');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/admin/items/${id}/approve`);
      toast.success('Item approved');
      fetchPendingItems();
    } catch (err) {
      toast.error('Failed to approve item');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`/api/admin/items/${id}/reject`, { reason: 'Inappropriate or spam' });
      toast.success('Item rejected and removed');
      fetchPendingItems();
    } catch (err) {
      toast.error('Failed to reject item');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Admin Panel - Pending Item Moderation</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="text-center text-gray-500">No pending items for approval.</div>
        ) : (
          <div className="space-y-6">
            {pendingItems.map(item => (
              <div key={item.id} className="card flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.description}</p>
                  <p className="text-xs text-gray-400">Listed by: {item.first_name} {item.last_name} ({item.email})</p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-success" onClick={() => handleApprove(item.id)}>Approve</button>
                  <button className="btn-warning" onClick={() => handleReject(item.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 