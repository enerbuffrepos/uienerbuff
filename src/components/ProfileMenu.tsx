import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { Account } from '../api/auth';
import type { Screen } from '../types';
import { canEditSetup } from '../permissions';
import { Button, Icon } from './ui';
import { s } from '../styles';
import ComplaintForm from './ComplaintForm';

type Props = { account: Account; visible: boolean; busy: boolean; onClose: () => void; onNavigate: (screen: Screen) => void; onLogout: () => void };

export function ProfileOptions({ account, busy, onNavigate, onLogout }: Pick<Props, 'account' | 'busy' | 'onNavigate' | 'onLogout'>) {
  const admin = canEditSetup(account);
  const role = account.role.charAt(0).toUpperCase() + account.role.slice(1);
  return <>
    <Text accessibilityRole="header" style={s.sectionTitle}>Welcome {account.name} — {role}</Text>
    <Text selectable style={s.body}>Consumer Number: {account.consumer}</Text>
    {!account.setupCompleted && <Text style={s.body}>{admin ? 'Complete your facility setup to unlock Home and profile options. Your completed steps are saved if you log out.' : 'Your organization admin is completing facility setup.'}</Text>}
    {account.setupCompleted && admin && <Button label="Members & requests" outline disabled={busy} onPress={() => onNavigate('team-access')}/>}
    <ComplaintForm organizationId={account.organizationId} disabled={busy}/>
    <Button label="Log out" disabled={busy} onPress={onLogout}/>
  </>;
}

export default function ProfileMenu({ account, visible, busy, onClose, onNavigate, onLogout }: Props) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.modalOverlay}><View accessibilityViewIsModal style={[s.modalCard, { maxHeight: '85%' }]}>
    <View style={s.rowBetween}><Text style={s.pageTitle}>My Profile</Text><Pressable accessibilityRole="button" accessibilityLabel="Close My Profile" onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close"/></Pressable></View>
    <ScrollView contentContainerStyle={{ gap: 14 }}><ProfileOptions account={account} busy={busy} onNavigate={onNavigate} onLogout={onLogout}/></ScrollView>
  </View></View></Modal>;
}
