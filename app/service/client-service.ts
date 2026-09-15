import axios from 'axios';

const CLIENT_API = axios.create({
    baseURL: 'http://localhost:8080/api', // Replace with your backend API base URL
    headers: {
        'Content-Type': 'application/json'
    }
});

export const clientService = {
    getAllClients: () => CLIENT_API.get('/clients'),
    getClientById: (id: string) => CLIENT_API.get(`/clients/getClientById/${id}`),
    createClient: (clientData: any) => CLIENT_API.post('/clients', clientData),
    updateClient: (id: string, clientData: any) => CLIENT_API.put(`/clients/updateClientById/${id}`, clientData),
    deleteClient: (id: string) => CLIENT_API.delete(`/clients/${id}`)
}