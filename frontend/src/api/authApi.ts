import apiClient from './client';
import type {
  User,
  UserLoginRequest,
  UserRegisterRequest,
  RefreshTokenRequest,
  TokenResponse,
} from '../types';

export const authApi = {
  async login(payload: UserLoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/login', payload);
    return response.data;
  },

  async register(payload: UserRegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', payload);
    return response.data;
  },

  async refreshToken(payload: RefreshTokenRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/refresh', payload);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};

export default authApi;
