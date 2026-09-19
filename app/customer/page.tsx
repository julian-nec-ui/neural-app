"use client";
import React, { useState } from 'react';
import { Trash2, UserPlus, UserCheck, RefreshCw } from 'lucide-react';

// Define the Customer type
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// Mock data to be loaded initially
const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '987-654-3210' },
  { id: '3', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-010-9999' },
];

function Customer() {
  // State initialized with the local array
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  
  // State for the form input
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    };

    setCustomers([...customers, newCustomer]);
    setFormData({ name: '', email: '', phone: '' });
  };

  const handleDelete = (id: string) => {
    const filtered = customers.filter(c => c.id !== id);
    setCustomers(filtered);
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear the list?")) {
      setCustomers([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <UserCheck className="text-indigo-600" size={36} />
            Customer Manager
          </h1>
          {customers.length > 0 && (
            <button 
              onClick={clearAll}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 px-3 py-1 rounded-full transition"
            >
              <RefreshCw size={14} /> Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-700">
                <UserPlus size={20} /> Add Customer
              </h2>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full p-2 border border-slate-300 text:[#424C1B] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition duration-200 shadow-md shadow-indigo-100"
                >
                  Save Customer
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-slate-600">Customer</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">Contact</th>
                    <th className="p-4 text-sm font-semibold text-slate-600 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.length > 0 ? (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{customer.name}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>{customer.email}</div>
                          <div className="text-xs text-slate-400">{customer.phone}</div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-slate-400 hover:text-red-500 transition p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-slate-400 italic">
                        No customers in the list.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Customer;