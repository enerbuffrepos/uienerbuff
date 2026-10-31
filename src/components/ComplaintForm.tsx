import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { authApi } from '../api/auth';
import { Button } from './ui';
import { s } from '../styles';
import { colors } from '../theme';

export default function ComplaintForm({ organizationId, disabled = false }: { organizationId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState('');
  const working = useRef(false);
  const requestId = useRef('');
  const submit = async () => {
    if (working.current) return;
    if (!title.trim() || !details.trim()) { setError('Enter a title and details for your complaint.'); return; }
    working.current = true; setBusy(true); setError('');
    try { const saved = await authApi.raiseComplaint(organizationId, title.trim(), details.trim(), requestId.current); setTicket(saved.id); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to raise your complaint. Please try again.'); }
    finally { working.current = false; setBusy(false); }
  };
  return <>
    <Button label="Raise a complaint" outline disabled={disabled} onPress={() => { if (!requestId.current || ticket) { requestId.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`; setTicket(''); setTitle(''); setDetails(''); } setError(''); setOpen(true); }}/>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!busy) setOpen(false); }}><KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View accessibilityViewIsModal style={[s.modalCard, { maxHeight: '90%' }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
      <Text accessibilityRole="header" style={s.pageTitle}>{ticket ? 'Complaint raised' : 'Raise a complaint'}</Text>
      {ticket ? <><Text accessibilityLiveRegion="polite" style={s.body}>Your complaint has been saved for our support team to review.</Text><Text selectable style={s.body}>Ticket reference: {ticket}</Text><Button label="Done" onPress={() => setOpen(false)}/></> : <>
        <Text style={s.label}>Title</Text><TextInput accessibilityLabel="Complaint title" editable={!busy} maxLength={150} value={title} onChangeText={setTitle} placeholder="Briefly describe the issue" placeholderTextColor={colors.muted} style={s.input}/>
        <Text style={s.label}>Details</Text><TextInput accessibilityLabel="Complaint details" editable={!busy} multiline maxLength={4000} value={details} onChangeText={setDetails} placeholder="Tell us what happened and how we can help" placeholderTextColor={colors.muted} style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}/>
        {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        <Button label={busy ? 'Raising complaint...' : 'Raise Complaint'} disabled={busy} onPress={submit}/><Button label="Cancel" outline disabled={busy} onPress={() => setOpen(false)}/>
      </>}
    </ScrollView></View></KeyboardAvoidingView></Modal>
  </>;
}
