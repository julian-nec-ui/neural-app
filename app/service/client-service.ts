import axios, { AxiosResponse } from 'axios';

// The structure of the address
export interface Address {
    // id is optional because it's not needed for creation, 
    // but will be returned by the DB after saving
    id?: number; 
    streetNumber: string;
    streetName: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

// The structure of the full Client
export interface Client {
    id: number; // Required when receiving from DB
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: Address;
}

const CLIENT_API = axios.create({
    baseURL: 'http://localhost:8081/api',
    headers: { 'Content-Type': 'application/json' }
});

export const clientService = {
    getAllClients: (): Promise<AxiosResponse<Client[]>> => 
        CLIENT_API.get('/clients'),

    // Use Omit<Client, 'id'> to tell TypeScript: 
    // "Accept all Client fields EXCEPT the id"
    createClient: (clientData: Omit<Client, 'id'>): Promise<AxiosResponse<Client>> => 
        CLIENT_API.post('/clients', clientData),

    updateClient: (id: number, clientData: Partial<Client>): Promise<AxiosResponse<Client>> => 
        CLIENT_API.put(`/clients/updateClientById/${id}`, clientData),

    deleteClient: (id: number): Promise<AxiosResponse<void>> => 
        CLIENT_API.delete(`/clients/${id}`)
}
