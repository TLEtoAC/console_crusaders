import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchItems();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const res = await axios.get('/api/admin/items');
      setItems(res.data.items);
    } catch (err) {
      toast.error('Failed to fetch items');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleToggleAdmin = async (id) => {
    try {
      await axios.put(`/api/admin/users/${id}/admin`);
      toast.success('Admin status updated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update admin status');
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/admin/items/${id}/approve`);
      toast.success('Item approved');
      fetchItems();
    } catch (err) {
      toast.error('Failed to approve item');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`/api/admin/items/${id}/reject`, { reason: 'Rejected by admin' });
      toast.success('Item rejected and removed');
      fetchItems();
    } catch (err) {
      toast.error('Failed to reject item');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/items/${id}`);
      toast.success('Item deleted');
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const isLoading = loadingUsers || loadingItems || loading;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Admin Management</h2>
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4">Users</h3>
          {loadingUsers ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Admin</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b">
                      <td className="px-4 py-2">{user.first_name} {user.last_name}</td>
                      <td className="px-4 py-2">{user.email}</td>
                      <td className="px-4 py-2">{user.is_admin ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2">
                        <button
                          className="btn-secondary"
                          onClick={() => handleToggleAdmin(user.id)}
                          disabled={user.is_admin && users.filter(u => u.is_admin).length === 1}
                          title={user.is_admin && users.filter(u => u.is_admin).length === 1 ? 'Cannot demote the last admin' : ''}
                        >
                          {user.is_admin ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4">All Items</h3>
          {loadingItems ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {items.length === 0 ? (
                <div className="text-center text-gray-500">No items found.</div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="card flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <p className="text-xs text-gray-400">Listed by: {item.first_name} {item.last_name} ({item.email})</p>
                      <p className="text-xs text-gray-400">Status: {item.is_approved ? 'Approved' : 'Pending'} | Available: {item.is_available ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="flex space-x-2">
                      {!item.is_approved && (
                        <button className="btn-success" onClick={() => handleApprove(item.id)}>Approve</button>
                      )}
                      {!item.is_approved && (
                        <button className="btn-warning" onClick={() => handleReject(item.id)}>Reject</button>
                      )}
                      <button className="btn-warning" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers; 