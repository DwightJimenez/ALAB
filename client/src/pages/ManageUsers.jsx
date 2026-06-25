import React, { useState, useEffect } from 'react';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/users', {
          method: 'GET',
          credentials: 'include', // CRITICAL: Sends the cookie to pass the Bouncer!
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch users');
          return;
        }

        setUsers(data);
      } catch (err) {
        setError('Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading users...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage System Users</h2>
        <button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
          + Add New User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-pink-100 text-pink-800">
              <th className="py-3 px-4 border-b font-semibold">ID</th>
              <th className="py-3 px-4 border-b font-semibold">Name</th>
              <th className="py-3 px-4 border-b font-semibold">Email</th>
              <th className="py-3 px-4 border-b font-semibold">Role</th>
              <th className="py-3 px-4 border-b font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 border-b transition-colors">
                <td className="py-3 px-4 text-gray-600">{user.id}</td>
                <td className="py-3 px-4 font-medium text-gray-800">{user.name}</td>
                <td className="py-3 px-4 text-gray-600">{user.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                    ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 
                      user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 
                      'bg-green-100 text-green-700'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button className="text-blue-500 hover:text-blue-700 mr-3 text-sm font-semibold">Edit</button>
                  <button className="text-red-500 hover:text-red-700 text-sm font-semibold">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">No users found in the database.</div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;