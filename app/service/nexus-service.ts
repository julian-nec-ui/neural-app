import axios, { AxiosResponse } from 'axios'

export interface NexusUserRequest {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface NexusUser {
  id: number
  firstName: string
  lastName: string
  email: string
}

export interface NexusLoginRequest {
  email: string
  password: string
}

const NEXUS_API = axios.create({
  baseURL: 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const nexusService = {
  getAllNexusUsers (): Promise<AxiosResponse<NexusUser[]>> {
    return NEXUS_API.get('/nexus')
  },
  createNexusUser (
    nexusUser: NexusUserRequest
  ): Promise<AxiosResponse<NexusUser>> {
    return NEXUS_API.post('/nexus', nexusUser)
  },

  loginUser(
    loginRequest: NexusLoginRequest
  ): Promise<AxiosResponse<NexusUser>> {
    return NEXUS_API.post('/nexus/login', loginRequest)
  }
}
