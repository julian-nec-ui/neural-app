import axios, { AxiosResponse } from 'axios';

// 1. Define the Client interface to match your backend and frontend
export interface Client {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
}

const CLIENT_API = axios.create({
    baseURL: 'http://localhost:8081/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

export const clientService = {
    // Returns a promise containing an array of Clients
    getAllClients: (): Promise<AxiosResponse<Client[]>> => 
        CLIENT_API.get('/clients'),

    // id is passed as string to the URL for compatibility
    getClientById: (id: string | number): Promise<AxiosResponse<Client>> => 
        CLIENT_API.get(`/clients/getClientById/${id}`),

    // Omit<Client, 'id'> means we send everything EXCEPT the id (since backend generates it)
    createClient: (clientData: Omit<Client, 'id'>): Promise<AxiosResponse<Client>> => 
        CLIENT_API.post('/clients', clientData),

    // Partial<Client> allows you to send only the fields that changed
    updateClient: (id: string | number, clientData: Partial<Client>): Promise<AxiosResponse<Client>> => 
        CLIENT_API.put(`/clients/updateClientById/${id}`, clientData),

    // Standardized id as string|number to match the other methods
    deleteClient: (id: string | number): Promise<AxiosResponse<void>> => 
        CLIENT_API.delete(`/clients/${id}`)
}
