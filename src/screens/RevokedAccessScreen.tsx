import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { authApi, type ProfileDeletionRequest } from '../api/auth';
import { Button, Icon } from '../components/ui';
import { s } from '../styles';
import { colors } from '../theme';

export default function RevokedAccessScreen({ consumer, onBack, onCheckAccess }: { consumer: string; onBack: () => void; onCheckAccess: () => Promise<void> }) {
  const [request, setRequest] = useState<ProfileDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const working = useRef(false);
  useEffect(() => {
    active.current = true;
    void authApi.profileDeletionRequest().then(value => { if (active.current) setRequest(value); }).catch(err => { if (active.current) setError(err instanceof Error ? err.message : 'Unable to check your deletion request.'); }).finally(() => { if (active.current) setLoading(false); });
    return () => { active.current = false; };
  }, []);

  const submit = async () => {
    if (working.current || loading || request) return;
    working.current = true; setBusy(true); setError('');
    try {
      const saved = await authApi.requestProfileDeletion();
      if (active.current) { setRequest(saved); setConfirming(false); }
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : 'Unable to submit your request.'); }
    finally { working.current = false; if (active.current) setBusy(false); }
  };
  const checkAccess = async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try { await onCheckAccess(); if (active.current) setMessage('Your access is still revoked. Please contact your organization admin to be added again.'); }
    catch (err) { if (active.current) setError(err instanceof Error ? err.message : 'Unable to check access.'); }
    finally { working.current = false; if (active.current) setBusy(false); }
  };

  return <>
    <View style={[s.card, r.card]}>
      <View style={r.icon}><Icon name="lock-closed-outline" size={30} color={colors.error}/></View>
      <Text accessibilityRole="header" style={s.pageTitle}>Your access has been revoked</Text>
      <Text style={s.body}>Your organization admin has revoked your access to {consumer}. You can no longer open this organization's landing page or dashboard.</Text>
      <Text style={s.body}>Your user profile is still saved. Please contact your organization admin to be added again.</Text>
      <Button label={busy && !confirming ? 'Checking...' : 'Check access again'} outline disabled={busy || loading} onPress={checkAccess}/>
      {!!message && <Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>}
      <View style={r.divider}/>
      {request ? <View style={r.notice}><Text accessibilityRole="header" style={s.sectionTitle}>Profile deletion requested</Text><Text accessibilityLiveRegion="polite" style={s.body}>Your request has been submitted for review. We will delete your profile within 7 working days.</Text><Text selectable style={s.body}>Request reference: {request.id}</Text><Text style={s.body}>Submitted {new Date(request.requestedAt).toLocaleDateString('en-IN')}</Text></View> : <>
        <Text style={s.sectionTitle}>Want to delete your profile permanently?</Text>
        <Text style={s.body}>Submit a request for review. We will delete your profile within 7 working days.</Text>
        <Button label={loading ? 'Checking request status...' : 'Request permanent profile deletion'} outline disabled={busy || loading} onPress={() => { setError(''); setConfirming(true); }}/>
      </>}
      {!confirming && !!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
      <Button label="Back to Login" disabled={busy} outline onPress={onBack}/>
    </View>
    <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirming(false); }}><View style={s.modalOverlay}><View accessibilityViewIsModal style={s.modalCard}>
      <Text accessibilityRole="header" style={s.pageTitle}>Request permanent profile deletion?</Text>
      <Text style={s.modalBody}>This request covers your entire Enerbuff profile, including memberships in other organizations. It will be reviewed by our team. We will delete your profile within 7 working days.</Text>
      {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
      <Button label={busy ? 'Submitting...' : 'Confirm deletion request'} disabled={busy} onPress={submit}/>
      <Button label="Cancel" outline disabled={busy} onPress={() => setConfirming(false)}/>
    </View></View></Modal>
  </>;
}

const r = StyleSheet.create({
  card: { padding: 20, gap: 14 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  notice: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: colors.goldSoft },
});
