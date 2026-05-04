import type { LeaveBalance, LeaveRequest } from './types';

const BASE_URL: string =
  (window as unknown as Record<string, unknown>)['RUNTIME_BACKEND_API_URL'] as string ||
  (import.meta.env.VITE_API_BASE_URL as string) ||
  'http://localhost:9090/api';

const API_BASE = BASE_URL.replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getBalance: (employeeId: string) =>
    request<LeaveBalance>(`/employees/${employeeId}/balance`),

  getRequests: (employeeId: string) =>
    request<LeaveRequest[]>(`/employees/${employeeId}/requests`),

  submitRequest: (
    employeeId: string,
    data: { startDate: string; endDate: string; reason: string }
  ) =>
    request<LeaveRequest>(`/employees/${employeeId}/requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPendingRequests: (managerId: string) =>
    request<LeaveRequest[]>(`/managers/${managerId}/pending-requests`),

  approveRequest: (requestId: string, managerId: string) =>
    request<LeaveRequest>(`/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ managerId }),
    }),

  rejectRequest: (requestId: string, managerId: string) =>
    request<LeaveRequest>(`/requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ managerId }),
    }),
};
