import { ApiError, apiFetch } from '@/shared/api/client';
import type { LoginPayload, SignupPayload, User } from '@/features/auth/model/types';

export async function getMe() {
  try {
    return await apiFetch<User>('/auth/me/', { method: 'GET' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export const login = (payload: LoginPayload) =>
  apiFetch<unknown>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const signup = (payload: SignupPayload) =>
  apiFetch<unknown>('/auth/signup/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const logout = () =>
  apiFetch<unknown>('/auth/logout/', {
    method: 'POST',
  });
