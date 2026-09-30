import axios, { AxiosResponse } from 'axios';

// The structure of the address
export interface Address { 
    clientId?: number;
    streetNumber: string;
    streetName: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

// The structure of the full Client
export interface Client {
    id: number; 
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addresses: Address[];
}


export interface ClientRequest {
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

    /**
     * Fixed: Changed from Omit<Client, 'id'> to a type that allows 
     * an optional id. This is necessary because we are sending 'id: 0' 
     * from the frontend to prevent the Java NullPointerException.
     */
    createClient: (clientData: Partial<ClientRequest> & { firstName: string; lastName: string; email: string; phone: string; address: Address }): Promise<AxiosResponse<Client>> => 
        CLIENT_API.post('/clients', clientData),

    updateClient: (id: number, clientData: Partial<Client>): Promise<AxiosResponse<Client>> => 
        CLIENT_API.put(`/clients/updateClientById/${id}`, clientData),

    deleteClient: (id: number): Promise<AxiosResponse<void>> => 
        CLIENT_API.delete(`/clients/${id}`)
}
