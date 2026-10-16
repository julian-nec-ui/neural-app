"use client";

import React, { useState, useEffect, useMemo } from 'react';

// Define TypeScript interfaces
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'delete' | ''>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Client; direction: 'asc' | 'desc' } | null>(null);

  // Sample client data
  const sampleClients: Client[] = [
    { id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '+1 (555) 123-4567', address: '123 Main St, City, State 12345' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '+1 (555) 987-6543', address: '456 Oak Ave, Town, State 67890' },
    { id: 3, firstName: 'Robert', lastName: 'Johnson', email: 'robert.j@example.com', phone: '+1 (555) 456-7890', address: '789 Pine Rd, Village, State 54321' },
    { id: 4, firstName: 'Emily', lastName: 'Williams', email: 'emily.w@hotmail.com', phone: '+1 (555) 234-5678', address: '321 Elm St, Borough, State 98765' },
    { id: 5, firstName: 'Michael', lastName: 'Brown', email: 'michael.b@example.com', phone: '+1 (555) 876-5432', address: '654 Maple Dr, County, State 43210' },
    { id: 6, firstName: 'Sarah', lastName: 'Davis', email: 'sarah.d@example.com', phone: '+1 (555) 345-6789', address: '987 Cedar Ln, District, State 87654' },
    { id: 7, firstName: 'David', lastName: 'Miller', email: 'david.m@example.com', phone: '+1 (555) 678-9012', address: '147 Birch Blvd, Region, State 32109' },
    { id: 8, firstName: 'Lisa', lastName: 'Wilson', email: 'lisa.w@example.com', phone: '+1 (555) 567-8901', address: '258 Spruce Way, Area, State 76543' },
    { id: 9, firstName: 'James', lastName: 'Moore', email: 'james.m@example.com', phone: '+1 (555) 789-0123', address: '369 Fir St, Zone, State 21098' },
    { id: 10, firstName: 'Jennifer', lastName: 'Taylor', email: 'jennifer.t@example.com', phone: '+1 (555) 890-1234', address: '471 Willow Rd, Sector, State 65432' },
  ];

  useEffect(() => {
    setClients(sampleClients);
  }, []);

  // Memoized filtered and sorted clients
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(client =>
        client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [clients, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const openModal = (type: 'view' | 'edit' | 'delete', client: Client) => {
    setSelectedClient(client);
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentItems.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const requestSort = (key: keyof Client) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Icon components
  const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  );

  const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  );

  const ViewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 6.615 3 12 3s10.268 2.943 11.542 7c-1.274 4.057-6.156 7-11.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );

  const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 100 2h1a1 1 0 100-2h-1z" clipRule="evenodd" />
    </svg>
  );

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${direction ? 'text-gray-700' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
    </svg>
  );

  const Modal: React.FC = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className={`bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ${isModalOpen ? 'scale-100' : 'scale-95'}`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {modalType === 'view' && 'Client Details'}
              {modalType === 'edit' && 'Edit Client'}
              {modalType === 'delete' && 'Delete Client'}
            </h3>
            <button 
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
            >
              <CloseIcon />
            </button>
          </div>
          
          {selectedClient && (
            <div className="space-y-4">
              {modalType === 'view' && (
                <>
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <LocationIcon />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{selectedClient.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <EmailIcon />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedClient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <PhoneIcon />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedClient.phone}</p>
                    </div>
                  </div>
                </>
              )}
              
              {modalType === 'edit' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input 
                      type="text" 
                      defaultValue={selectedClient.firstName}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input 
                      type="text" 
                      defaultValue={selectedClient.lastName}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      defaultValue={selectedClient.email}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input 
                      type="tel" 
                      defaultValue={selectedClient.phone}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea 
                      defaultValue={selectedClient.address}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
              
              {modalType === 'delete' && (
                <div className="text-center">
                  <p className="text-gray-700">Are you sure you want to delete this client?</p>
                  <p className="font-medium mt-2">{selectedClient.firstName} {selectedClient.lastName}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Cancel
            </button>
            {modalType === 'view' && (
              <button
                type="button"
                onClick={() => openModal('edit', selectedClient!)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Edit
              </button>
            )}
            {modalType === 'edit' && (
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                Save Changes
              </button>
            )}
            {modalType === 'delete' && (
              <button
                type="button"
                onClick={() => {
                  // Handle delete logic here
                  closeModal();
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your client information</p>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-lg shadow mb-4 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            />
          </div>
          <div className="flex space-x-2">
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 transition-colors duration-200"
                />
              </div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200"
                onClick={() => requestSort('firstName')}
              >
                <span>Name</span>
                <SortIcon direction={sortConfig?.key === 'firstName' ? sortConfig.direction : null} />
              </div>
              <div 
                className="col-span-3 flex items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200"
                onClick={() => requestSort('email')}
              >
                <span>Email</span>
                <SortIcon direction={sortConfig?.key === 'email' ? sortConfig.direction : null} />
              </div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200"
                onClick={() => requestSort('phone')}
              >
                <span>Phone</span>
                <SortIcon direction={sortConfig?.key === 'phone' ? sortConfig.direction : null} />
              </div>
              <div className="col-span-3">Address</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Table Body with Fixed Height and Hover Animation */}
          <div className="max-h-[500px] overflow-y-auto">
            {currentItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No clients found
              </div>
            ) : (
              currentItems.map((client, index) => (
                <div 
                  key={client.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-white ${selectedRows.includes(client.id) ? 'bg-blue-50' : ''}`}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    transform: 'translateZ(0)',
                    willChange: 'transform'
                  }}
                >
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(client.id)}
                      onChange={() => handleSelectRow(client.id)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 transition-colors duration-200"
                    />
                  </div>
                  <div className="col-span-2 font-medium">
                    {client.firstName} {client.lastName}
                  </div>
                  <div className="col-span-3 flex items-center space-x-2">
                    <EmailIcon />
                    <span>{client.email}</span>
                  </div>
                  <div className="col-span-2 flex items-center space-x-2">
                    <PhoneIcon />
                    <span>{client.phone}</span>
                  </div>
                  <div className="col-span-3 flex items-start space-x-2">
                    <LocationIcon />
                    <span className="truncate">{client.address}</span>
                  </div>
                  <div className="col-span-1 flex space-x-2">
                    <button 
                      onClick={() => openModal('view', client)}
                      className="p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-200"
                      title="View"
                    >
                      <ViewIcon />
                    </button>
                    <button 
                      onClick={() => openModal('edit', client)}
                      className="p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-200"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button 
                      onClick={() => openModal('delete', client)}
                      className="p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-200"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-700 mb-4 md:mb-0">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-medium">{Math.min(indexOfLastItem, filteredAndSortedClients.length)}</span> of{' '}
              <span className="font-medium">{filteredAndSortedClients.length}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal />
    </div>
  );
};

export default ClientList;
