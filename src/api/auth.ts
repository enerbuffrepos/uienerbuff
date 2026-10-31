import { Platform } from 'react-native';
import { REGISTRATION_TERMS_VERSION } from '../registrationTerms';
import type { Asset, FacilityForm } from '../types';

export type FacilitySetup = { form?: FacilityForm; consumerMatched?: boolean; consent?: boolean[]; connected?: boolean; assets?: Asset[]; commitment?: number | null };
export type FacilityStepInput = { step: 1 } | { step: 2; consent: boolean[] } | { step: 3; assets: Asset[] } | { step: 4; commitment: number };

export type AccessStatus = 'existing' | 'admin-pending' | 'member-pending' | 'approved' | 'unregistered' | 'rejected' | 'revoked';
export type Account = {
  membershipId: string;
  organizationId: string;
  consumer: string;
  name: string;
  role: 'admin' | 'approver' | 'operator' | 'viewer';
  status: 'admin-pending' | 'member-pending' | 'approved' | 'rejected' | 'revoked';
  adminApproved: boolean;
  setupStep: number;
  setupCompleted: boolean;
  facility?: FacilitySetup;
};
type Registration = { status: AccessStatus; consumer: string; organizationId: string; adminApproved: boolean };
export type MemberRole = 'approver' | 'operator' | 'viewer';
export type AccessRequest = { id: string; name: string; phone: string; status: 'member-pending'; createdAt: string };
export type OrganizationMember = { id: string; name: string; phone: string; role: Account['role']; status: Account['status']; createdAt: string };
export type ProfileDeletionRequest = { id: string; status: 'pending'; requestedAt: string };
const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000')).replace(/\/$/, '');
let token: string | null = null;

async function request<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) {
      if (response.status === 401) token = null;
      throw new Error(data.error ?? 'Unable to complete this request.');
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error instanceof TypeError)) {
      throw new Error('Cannot reach the backend. Check that the API is running and EXPO_PUBLIC_API_URL is correct.');
    }
    throw error;
  } finally { clearTimeout(timer); }
}

export const authApi = {
  checkConsumer(consumer: string) { return request<{ registered: boolean; matched: boolean }>('/auth/consumer/check', { consumer }); },
  clearSession() { token = null; },
  hasSession() { return token !== null; },
  requestOtp(phone: string) { return request<{ challengeId: string; retryAfter: number }>('/auth/otp/request', { phone }); },
  async verifyOtp(phone: string, challengeId: string, otp: string) {
    const response = await request<{ token: string; accounts: Account[] }>('/auth/otp/verify', { phone, challengeId, otp });
    token = response.token;
    return response.accounts;
  },
  async accounts() { return (await request<{ accounts: Account[] }>('/auth/me')).accounts; },
  register(name: string, consumer: string, requestMembership = false) {
    return request<Registration>('/auth/register', { name, consumer, requestMembership, consent: { accepted: true, termsVersion: REGISTRATION_TERMS_VERSION } });
  },
  async openOrganization(id: string) { return (await request<{ account: Account }>(`/organizations/${id}`)).account; },
  saveFacilityStep(id: string, input: FacilityStepInput) { return request<{ account: Account; facility: FacilitySetup }>(`/organizations/${id}/facility`, input); },
  async raiseComplaint(id: string, title: string, details: string, requestId: string) { return (await request<{ complaint: { id: string; status: string } }>(`/organizations/${id}/complaints`, { title, details, requestId })).complaint; },
  async listRequests(organizationId: string) {
    return (await request<{ requests: AccessRequest[] }>(`/organizations/${organizationId}/requests`)).requests;
  },
  async listMembers(organizationId: string) { return (await request<{ members: OrganizationMember[] }>(`/organizations/${organizationId}/members`)).members; },
  updateMemberRole(organizationId: string, membershipId: string, role: MemberRole) { return request<{ role: MemberRole }>(`/organizations/${organizationId}/members/${membershipId}/role`, { role }); },
  revokeMember(organizationId: string, membershipId: string) { return request<{ status: 'revoked' }>(`/organizations/${organizationId}/members/${membershipId}/revoke`, { confirmed: true }); },
  restoreMember(organizationId: string, membershipId: string, role: MemberRole) { return request<{ status: 'approved'; role: MemberRole }>(`/organizations/${organizationId}/members/${membershipId}/restore`, { role }); },
  async profileDeletionRequest() { return (await request<{ request: ProfileDeletionRequest | null }>('/auth/profile-deletion')).request; },
  async requestProfileDeletion() { return (await request<{ request: ProfileDeletionRequest }>('/auth/profile-deletion', { confirmed: true })).request; },
  reviewRequest(organizationId: string, membershipId: string, decision: 'approve' | 'reject', role?: MemberRole) {
    return request<{ status: 'approved' | 'rejected' }>(`/organizations/${organizationId}/requests/${membershipId}/review`, { decision, ...(decision === 'approve' ? { role } : {}) });
  },
  async logout() { try { await request('/auth/logout', {}); } finally { token = null; } },
};
