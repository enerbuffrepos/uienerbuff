import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { authApi, type AccessRequest, type Account, type MemberRole, type OrganizationMember } from '../api/auth';
import { Button, Icon } from '../components/ui';
import { canEditSetup } from '../permissions';
import { s } from '../styles';
import { colors } from '../theme';

const roles: { value: MemberRole; label: string }[] = [
  { value: 'approver', label: 'Approver' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

const memberPriority: Record<OrganizationMember['status'], number> = {
  approved: 0,
  'member-pending': 1,
  'admin-pending': 1,
  rejected: 2,
  revoked: 3,
};

export function AccessRequestCard({ request, disabled, onReview }: {
  request: AccessRequest;
  disabled: boolean;
  onReview: (request: AccessRequest, decision: 'approve' | 'reject', role?: MemberRole) => void;
}) {
  const [role, setRole] = useState<MemberRole | null>(null);
  const [rejecting, setRejecting] = useState(false);
  return <View style={[s.card, t.card]}>
    <View style={s.rowBetween}><Text style={[s.sectionTitle, s.flex]}>{request.name}</Text><Text style={t.badge}>Pending</Text></View>
    <Text style={s.body}>+91 {request.phone}</Text>
    <Text style={s.body}>Requested {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
    <Text style={t.label}>Choose a role before approving</Text>
    <View style={t.roles}>{roles.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${option.label} role for ${request.name}`} accessibilityState={{ checked: role === option.value, disabled }} disabled={disabled} onPress={() => setRole(option.value)} style={[t.role, role === option.value && t.selected]}><Text style={[t.roleText, role === option.value && t.selectedText]}>{option.label}</Text></Pressable>)}</View>
    {rejecting ? <View style={t.confirm}>
      <Text style={s.body}>Reject {request.name}'s access request? They will remain unable to access this organization.</Text>
      <Button label="Confirm rejection" disabled={disabled} onPress={() => onReview(request, 'reject')}/>
      <Button label="Cancel" outline disabled={disabled} onPress={() => setRejecting(false)}/>
    </View> : <>
      <Button label={role ? `Approve as ${roles.find(option => option.value === role)?.label}` : 'Select a role to approve'} disabled={disabled || !role} onPress={() => { if (role) onReview(request, 'approve', role); }}/>
      <Button label="Reject request" outline disabled={disabled} onPress={() => setRejecting(true)}/>
    </>}
  </View>;
}

export function MemberCard({ member, disabled, onUpdate, onDeletion, onRestore }: { member: OrganizationMember; disabled: boolean; onUpdate: (member: OrganizationMember, role: MemberRole) => void; onDeletion: (member: OrganizationMember) => void; onRestore: (member: OrganizationMember, role: MemberRole) => void }) {
  const [role, setRole] = useState(member.role);
  useEffect(() => { setRole(member.role); }, [member.role]);
  const editable = member.status === 'approved' && member.role !== 'admin';
  const revoked = member.status === 'revoked';
  return <View style={[s.card, t.card]}>
    <View style={s.rowBetween}><Text style={[s.sectionTitle, s.flex]}>{member.name}</Text><Text style={t.badge}>{revoked ? 'Access revoked' : member.status.replace(/-/g, ' ')}</Text>{editable && <Pressable accessibilityRole="button" accessibilityLabel={`Delete member ${member.name}`} accessibilityHint="Opens a confirmation before revoking organization access" accessibilityState={{ disabled }} disabled={disabled} onPress={() => onDeletion(member)} style={t.deleteIcon}><Icon name="trash-outline" size={21} color={colors.error}/></Pressable>}</View>
    <Text style={s.body}>+91 {member.phone}</Text><Text style={t.label}>Current role: {member.role}</Text>
    {(editable || revoked) && <><View style={t.roles}>{roles.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${option.label} role for ${member.name}`} accessibilityState={{ checked: role === option.value, disabled }} disabled={disabled} onPress={() => setRole(option.value)} style={[t.role, role === option.value && t.selected]}><Text style={[t.roleText, role === option.value && t.selectedText]}>{option.label}</Text></Pressable>)}</View><Button label={revoked ? 'Restore access' : 'Save role'} disabled={disabled || (!revoked && role === member.role)} onPress={() => { if (role !== 'admin') { if (revoked) onRestore(member, role); else onUpdate(member, role); } }}/></>}
    {member.role === 'admin' && <Text style={s.body}>Contact the help desk for changes to admin access.</Text>}
    {revoked && <Text style={s.body}>This member cannot access your organization. Restore access to add them again.</Text>}
  </View>;
}

export default function TeamAccessScreen({ account, onBack }: { account: Account; onBack: () => void }) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [deleting, setDeleting] = useState<OrganizationMember | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const working = useRef(false);
  const allowed = canEditSetup(account);
  const listedMembers = members.filter(member => member.status !== 'revoked').sort((left, right) => memberPriority[left.status] - memberPriority[right.status]);
  const approvedCount = members.filter(member => member.status === 'approved').length;
  const pendingCount = members.filter(member => member.status === 'member-pending' || member.status === 'admin-pending').length;
  const load = useCallback(async () => {
    if (!allowed || working.current) return;
    working.current = true;
    setLoading(true); setError('');
    try {
      const nextMembers = await authApi.listMembers(account.organizationId);
      if (active.current) setMembers(nextMembers);
    } catch (err) {
      if (active.current) { setMembers([]); setError(err instanceof Error ? err.message : 'Unable to load team access.'); }
    } finally {
      working.current = false;
      if (active.current) setLoading(false);
    }
  }, [account.organizationId, allowed]);

  useEffect(() => {
    active.current = true;
    void load();
    return () => { active.current = false; };
  }, [load]);

  const review = async (request: AccessRequest, decision: 'approve' | 'reject', role?: MemberRole) => {
    if (!allowed || working.current || (decision === 'approve' && !role)) return;
    working.current = true;
    setSaving(true); setError(''); setMessage('');
    try {
      await authApi.reviewRequest(account.organizationId, request.id, decision, role);
      if (active.current) {
        setMembers(current => current.map(item => item.id === request.id ? { ...item, status: decision === 'approve' ? 'approved' : 'rejected', role: decision === 'approve' ? role! : 'viewer' } : item));
        setMessage(decision === 'approve' ? `${request.name} is approved as ${role}. They can log in to access your organization.` : `${request.name}'s access request was rejected.`);
      }
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : 'Unable to review this request.');
    } finally {
      working.current = false;
      if (active.current) setSaving(false);
    }
  };

  const updateRole = async (member: OrganizationMember, role: MemberRole) => {
    if (!allowed || working.current) return;
    working.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const result = await authApi.updateMemberRole(account.organizationId, member.id, role);
      if (active.current) { setMembers(current => current.map(item => item.id === member.id ? { ...item, role: result.role } : item)); setMessage(`${member.name}'s role is now ${result.role}.`); }
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : 'Unable to update role.'); }
    finally { working.current = false; if (active.current) setSaving(false); }
  };

  const revoke = async () => {
    if (!allowed || working.current || !deleting) return;
    working.current = true; setSaving(true); setDeleteError(''); setMessage('');
    try {
      await authApi.revokeMember(account.organizationId, deleting.id);
      if (active.current) { setMembers(current => current.map(item => item.id === deleting.id ? { ...item, status: 'revoked' } : item)); setMessage(`${deleting.name}'s access has been revoked. Their user profile is retained.`); setDeleting(null); }
    } catch (err) { if (active.current) setDeleteError(err instanceof Error ? err.message : 'Unable to revoke access.'); }
    finally { working.current = false; if (active.current) setSaving(false); }
  };

  const restore = async (member: OrganizationMember, role: MemberRole) => {
    if (!allowed || working.current) return;
    working.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const result = await authApi.restoreMember(account.organizationId, member.id, role);
      if (active.current) { setMembers(current => current.map(item => item.id === member.id ? { ...item, ...result } : item)); setMessage(`${member.name}'s access has been restored as ${result.role}. They can log in again.`); }
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : 'Unable to restore access.'); }
    finally { working.current = false; if (active.current) setSaving(false); }
  };

  if (!allowed) return <View style={[s.card, t.card]}><Text style={s.sectionTitle}>Admin access required</Text><Text style={s.body}>Only your organization admin can review member requests.</Text><Button label="Back to dashboard" onPress={onBack}/></View>;

  return <>
    <View style={s.headingRow}><Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" style={s.backButton} onPress={onBack}><Icon name="arrow-back"/></Pressable><View style={s.flex}><Text style={s.pageTitle}>Team access</Text><Text style={s.body}>View members, update roles, and review access requests.</Text></View></View>
    <View style={[s.card, t.card]}><View style={s.rowBetween}><Icon name="business-outline"/><Text style={[s.sectionTitle, s.flex]}>{account.consumer}</Text></View><Text style={s.body}>Only requests for this Consumer ID appear here.</Text><Text style={s.body}>Approver, Operator, and Viewer members can view steps 1-3. Only admins can edit these steps.</Text></View>
    <View style={s.rowBetween}><Text style={s.sectionTitle}>{loading ? 'Loading members...' : `Members (${listedMembers.length})`}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh members" accessibilityState={{ disabled: loading || saving }} disabled={loading || saving} onPress={() => { setMessage(''); void load(); }} style={t.refresh}><Icon name="refresh" size={17}/><Text style={s.link}>Refresh</Text></Pressable></View>
    {!loading && !error && <Text style={s.body}>{approvedCount} approved · {pendingCount} pending</Text>}
    {!!error && <View style={[s.card, t.card]}><Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text><Button label="Reload members" outline disabled={loading || saving} onPress={() => { setMessage(''); void load(); }}/></View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={t.success}>{message}</Text>}
    {saving && <Text accessibilityLiveRegion="polite" style={s.body}>Saving changes...</Text>}
    {!loading && listedMembers.map(member => member.status === 'member-pending'
      ? <AccessRequestCard key={member.id} request={{ ...member, status: 'member-pending' }} disabled={saving || !!error} onReview={review}/>
      : <MemberCard key={member.id} member={member} disabled={saving || !!error} onUpdate={updateRole} onRestore={restore} onDeletion={item => { setDeleting(item); setDeleteError(''); setMessage(''); }}/>) }
    {!loading && members.some(member => member.status === 'revoked') && <><Text style={s.sectionTitle}>Revoked access</Text>{members.filter(member => member.status === 'revoked').map(member => <MemberCard key={member.id} member={member} disabled={saving || !!error} onUpdate={updateRole} onRestore={restore} onDeletion={() => {}}/>)}</>}
    <Modal visible={!!deleting} transparent animationType="fade" onRequestClose={() => { if (!saving) setDeleting(null); }}><View style={s.modalOverlay}><View accessibilityViewIsModal style={s.modalCard}><Text accessibilityRole="header" style={s.pageTitle}>Delete member?</Text><Text style={s.modalBody}>Deleting {deleting?.name} will revoke their access to {account.consumer}. They will no longer be able to open this organization's landing page or dashboard. Their user profile will remain saved, and you can restore their access later.</Text>{!!deleteError && <Text accessibilityLiveRegion="polite" style={s.error}>{deleteError}</Text>}<Button label={saving ? 'Revoking access...' : 'Delete member'} disabled={saving} onPress={revoke}/><Button label="Cancel" outline disabled={saving} onPress={() => setDeleting(null)}/></View></View></Modal>
  </>;
}

const t = StyleSheet.create({
  deleteIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.background },
  card: { padding: 16, gap: 10 },
  label: { fontSize: 12, color: colors.text, fontWeight: '600', marginTop: 4 },
  badge: { color: colors.goldText, backgroundColor: colors.goldSoft, fontSize: 11, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  role: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 7 },
  selected: { backgroundColor: colors.primary },
  roleText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  selectedText: { color: colors.surface },
  confirm: { padding: 12, backgroundColor: colors.goldSoft, borderRadius: 8, gap: 10 },
  refresh: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6 },
  empty: { padding: 24, alignItems: 'center', gap: 10 },
  success: { padding: 12, color: colors.success, backgroundColor: colors.successSoft, fontSize: 12, lineHeight: 18, borderRadius: 8 },
});
