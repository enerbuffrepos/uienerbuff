import { colors } from './src/theme';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, Image, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Icon, IconBubble } from './src/components/ui';
import HomeScreen from './src/screens/HomeScreen';
import ProfileMenu from './src/components/ProfileMenu';
import AuthScreen from './src/screens/AuthScreen';
import TeamAccessScreen from './src/screens/TeamAccessScreen';
import { authApi, type Account, type FacilityStepInput } from './src/api/auth';
import { canEditSetup, canNavigateTo, landingScreen, requiresSetup } from './src/permissions';
import VerifyFacilityScreen from './src/screens/VerifyFacilityScreen';
import FlexibleAssetsScreen from './src/screens/FlexibleAssetsScreen';
import FlexibilityPotentialScreen from './src/screens/FlexibilityPotentialScreen';
import DashboardScreen, { DashboardNavigation } from './src/screens/DashboardScreen';
import { initialAssets, recommendedCommitment } from './src/data';
import { s } from './src/styles';
import type { Asset, FacilityForm, Screen, Sheet } from './src/types';

function Main() {
  const [screen, updateScreen] = useState<Screen>(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [revokedAccount, setRevokedAccount] = useState<Account | null>(null);
  const canEdit = canEditSetup(account);
  const mandatorySetup = requiresSetup(account);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupError, setSetupError] = useState('');
  const savingSetupRef = useRef(false);
  const sessionVersion = useRef(0);
  const accessCheck = useRef<{ version: number; promise: Promise<Account[]> } | null>(null);
  const lastAccessCheck = useRef({ version: -1, checkedAt: 0 });
  const showHeaderActions = !!account && screen !== 'auth';
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutInProgress = useRef(false);
  const openProfile = () => { setSheet(null); setProfileOpen(true); };
  const setScreen = (next: Screen) => {
    if (next === 2) next = 1;
    if (savingSetupRef.current || !canNavigateTo(account, next)) return;
    if (next === 'team-access' && !canEdit) return;
    if (next === 0) setRevokedAccount(null);
    updateScreen(typeof next === 'number' && next > 0 && !account ? 'auth' : next);
  };
  const logout = async () => {
    if (savingSetupRef.current || logoutInProgress.current) return;
    logoutInProgress.current = true; setLoggingOut(true);
    sessionVersion.current++;
    try { await authApi.logout(); } catch { /* Local session is cleared even if the API is unavailable. */ }
    setAccount(null); setRevokedAccount(null); setContactName(''); setSheet(null); setProfileOpen(false); updateScreen('auth');
    logoutInProgress.current = false; setLoggingOut(false);
  };
  const [contactName, setContactName] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [form, setForm] = useState<FacilityForm>({ company: 'ABC Manufacturing Pvt. Ltd.', consumer: 'MSEDCL-HV2-004582', discom: 'MSEDCL', location: 'Pune, Maharashtra', email: 'energy@abcmfg.com', mobile: '+91 9876543212' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [commitment, setCommitment] = useState(200);
  const [approvedCommitment, setApprovedCommitment] = useState<number | null>(null);
  useEffect(() => {
    if (!account) return;
    let active = true;
    let checking = false;
    const checkAccess = async () => {
      if (checking || savingSetupRef.current) return;
      const version = sessionVersion.current;
      // Navigation and foreground events reuse recent results; no background polling.
      if (lastAccessCheck.current.version === version && Date.now() - lastAccessCheck.current.checkedAt < 10000) return;
      checking = true;
      let pending: typeof accessCheck.current = null;
      try {
        pending = accessCheck.current?.version === version ? accessCheck.current : { version, promise: authApi.accounts() };
        accessCheck.current = pending;
        const current = (await pending.promise).find(item => item.organizationId === account.organizationId);
        if (!active || version !== sessionVersion.current || savingSetupRef.current) return;
        lastAccessCheck.current = { version, checkedAt: Date.now() };
        if (current?.status === 'approved') {
          setAccount(previous => ({ ...current, setupStep: Math.max(previous?.setupStep ?? 0, current.setupStep), setupCompleted: previous?.setupCompleted === true || current.setupCompleted }));
          if (screen === 'team-access' && current.role !== 'admin') updateScreen(5);
          if (!canNavigateTo(current, screen)) updateScreen(landingScreen(current));
        } else {
          setRevokedAccount(current?.status === 'revoked' ? current : null);
          setAccount(null); setSheet(null); updateScreen('auth');
        }
      } catch {
        if (active && version === sessionVersion.current && !authApi.hasSession()) { setAccount(null); setRevokedAccount(null); setSheet(null); updateScreen('auth'); }
      } finally { checking = false; if (accessCheck.current === pending) accessCheck.current = null; }
    };
    void checkAccess();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void checkAccess(); });
    return () => { active = false; subscription.remove(); };
  }, [account?.organizationId, screen]);
  const saveStep = async (input: FacilityStepInput, next: Screen) => {
    if (!account || !canEdit || savingSetupRef.current) return;
    savingSetupRef.current = true; setSavingSetup(true); setSetupError('');
    const version = sessionVersion.current;
    try {
      const saved = await authApi.saveFacilityStep(account.organizationId, input);
      if (version !== sessionVersion.current) return;
      sessionVersion.current++;
      lastAccessCheck.current = { version: sessionVersion.current, checkedAt: Date.now() };
      setAccount(saved.account);
      if (saved.facility.form) setForm(saved.facility.form);
      if (input.step === 1) setConnected(true);
      if (input.step === 3) {
        setCommitment(saved.facility.commitment ?? recommendedCommitment(assets));
        setApprovedCommitment(saved.facility.commitment ?? null);
      }
      if (input.step === 4) setApprovedCommitment(saved.facility.commitment ?? null);
      updateScreen(next);
    } catch (error) { if (version === sessionVersion.current) setSetupError(error instanceof Error ? error.message : 'Unable to save this step. Please try again.'); }
    finally { savingSetupRef.current = false; setSavingSetup(false); }
  };
  const saveAssets = () => { void saveStep({ step: 3, assets }, 4); };
  const { width } = useWindowDimensions();
  const change = (key: keyof typeof form, value: string) => { if (!canEdit || savingSetupRef.current) return; setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: '' })); };
  const verify = () => {
    if (!canEdit || savingSetupRef.current) return;
    void saveStep({ step: 1 }, 3);
  };
  return <SafeAreaView style={s.safe}><StatusBar style="dark"/><View style={[s.shell, width > 600 && s.desktopShell]}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Enerbuff home" disabled={mandatorySetup || savingSetup} onPress={()=>setScreen(account?5:0)} style={s.logo}><Image source={require('./assets/Enerbuff.png')} style={s.logoImage} resizeMode="contain" accessible={false}/><Text style={s.logoText}>Enerbuff</Text></Pressable>{showHeaderActions && <View style={s.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={()=>setSheet({title:'You’re all caught up',body:'Programme updates and event invitations will appear here once your facility is connected.'})} style={s.headerIcon}><Icon name="notifications-outline" color={colors.text} size={25}/><View style={s.dot}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="My Profile" onPress={openProfile}><IconBubble name="person" small/></Pressable></View>}</View>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView key={screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {mandatorySetup && <View style={[s.card,{padding:12}]}><Text style={s.body}>Complete all three facility setup steps to open your home dashboard. Each completed step is saved.</Text></View>}
      {account && !canEdit && <Text style={s.body}>View-only access. Only your organization admin can update facility setup.</Text>}
      {screen===0 && <HomeScreen setScreen={setScreen} setSheet={setSheet}/>} 
      {screen==='team-access' && account && canEdit && <TeamAccessScreen key={account.organizationId} account={account} onBack={()=>setScreen(5)}/>}
      {screen==='auth' && <AuthScreen initialRevokedAccount={revokedAccount} initialPhone={revokedAccount ? form.mobile.replace(/\D/g, '').slice(-10) : ''} onBack={()=>setScreen(0)} onComplete={({name, consumer, phone, account: nextAccount})=>{setProfileOpen(false);sessionVersion.current++;lastAccessCheck.current={version:sessionVersion.current,checkedAt:Date.now()};const saved=nextAccount.facility;const savedAssets=saved?.assets??initialAssets;setRevokedAccount(null);setAccount(nextAccount);setContactName(name);setForm(saved?.form??{company:'',consumer,discom:'',location:'',email:'',mobile:phone});setErrors({});setSetupError('');setConnected(saved?.connected??false);setAssets(savedAssets);setCommitment(saved?.commitment??recommendedCommitment(savedAssets));setApprovedCommitment(saved?.commitment??null);updateScreen(landingScreen(nextAccount));}}/>}
      {!!setupError && account && <Text accessibilityLiveRegion="polite" style={s.error}>{setupError}</Text>}
      {screen===1 && <VerifyFacilityScreen mandatory={mandatorySetup} saving={savingSetup} readOnly={!canEdit} matched={!!form.company && /^\d{12}$/.test(form.consumer)} setScreen={setScreen} form={form} verify={verify} connected={connected} setSheet={setSheet}/>} 
      {screen===3 && <FlexibleAssetsScreen saving={savingSetup} readOnly={!canEdit} assets={assets} setAssets={update=>{if(!canEdit || savingSetupRef.current)return;const next=typeof update==='function'?update(assets):update;setAssets(next);setCommitment(recommendedCommitment(next));setApprovedCommitment(null);}} setScreen={setScreen} onSave={saveAssets}/>}
      {screen===4 && <FlexibilityPotentialScreen mandatory={mandatorySetup} saving={savingSetup} readOnly={!canEdit} assets={assets} commitment={commitment} setCommitment={value=>{if(canEdit && !savingSetupRef.current)setCommitment(value);}} setScreen={setScreen} setSheet={setSheet} onApprove={()=>{void saveStep({step:4,commitment},5);}}/>}
      {screen===5 && <DashboardScreen readOnly={!canEdit} form={form} assets={assets} approvedCommitment={approvedCommitment} setScreen={setScreen} setSheet={setSheet}/>}
    </ScrollView></KeyboardAvoidingView>
    {account && !mandatorySetup && screen !== 'auth' && screen !== 0 && <DashboardNavigation setScreen={setScreen} setSheet={setSheet} onProfile={openProfile} disabled={savingSetup || loggingOut} activeTab={profileOpen || screen === 'team-access' ? 'Profile' : screen === 5 ? 'Home' : 'Assets'}/>} 
    {account && <ProfileMenu account={account} visible={profileOpen} busy={savingSetup || loggingOut} onClose={()=>setProfileOpen(false)} onNavigate={next=>{if(savingSetupRef.current || logoutInProgress.current || !canNavigateTo(account,next))return;setProfileOpen(false);setScreen(next);}} onLogout={logout}/>}
    <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={()=>setSheet(null)}><View style={s.modalOverlay}><Pressable accessibilityRole="button" accessibilityLabel="Dismiss dialog" style={StyleSheet.absoluteFill} onPress={()=>setSheet(null)}/><View accessibilityViewIsModal style={s.modalCard}><View style={s.rowBetween}><Text style={[s.pageTitle,{flex:1}]}>{sheet?.title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" hitSlop={12} onPress={()=>setSheet(null)}><Icon name="close" color={colors.muted}/></Pressable></View>{sheet?.kind==='success' && <View style={s.successIcon}><Icon name="checkmark-circle" size={64} color={colors.success}/></View>}{sheet?.kind==='discom'||sheet?.kind==='location' ? (sheet.kind==='discom'?['MSEDCL','Tata Power','Adani Electricity','BESCOM']:['Pune, Maharashtra','Mumbai, Maharashtra','Nagpur, Maharashtra','Bengaluru, Karnataka']).map(option=><Pressable accessibilityRole="button" key={option} style={s.option} onPress={()=>{change(sheet.kind as 'discom'|'location',option);setSheet(null);}}><Text style={s.inputValue}>{option}</Text>{form[sheet.kind as 'discom'|'location']===option && <Icon name="checkmark" size={20}/>}</Pressable>):<><Text style={s.modalBody}>{sheet?.body}</Text><Button label="Got it" onPress={()=>setSheet(null)}/></>}</View></View></Modal>
  </View></SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Main/></SafeAreaProvider>;}
