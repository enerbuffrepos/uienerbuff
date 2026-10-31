import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, ScrollView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Icon } from '../components/ui';
import { colors } from '../theme';
import { s } from '../styles';
import { authApi, type Account, type AccessStatus } from '../api/auth';
import { REGISTRATION_TERMS_VERSION, registrationTerms } from '../registrationTerms';
import RevokedAccessScreen from './RevokedAccessScreen';

type Details = { name: string; consumer: string; phone: string };
type Props = { onBack: () => void; onComplete: (details: Details & { account: Account }) => void; initialRevokedAccount?: Account | null; initialPhone?: string };

// The backend validates the temporary development OTP.
const DEMO_OTP = '123456';

export default function AuthScreen({ onBack, onComplete, initialRevokedAccount, initialPhone = '' }: Props) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [details, setDetails] = useState<Details>({ name: initialRevokedAccount?.name ?? '', consumer: initialRevokedAccount?.consumer ?? '', phone: initialPhone });
  const [otp, setOtp] = useState('');
  const [requested, setRequested] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AccessStatus | null>(initialRevokedAccount ? 'revoked' : null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [challengeId, setChallengeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [adminApproved, setAdminApproved] = useState(false);
  const [consumerCheck, setConsumerCheck] = useState<{ consumer: string; registered?: boolean; matched?: boolean; error?: string } | null>(null);
  const [checkRetry, setCheckRetry] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const hintPulse = useRef(new Animated.Value(0)).current;
  const registering = mode === 'register';
  const consumer = details.consumer.trim().toUpperCase();
  const check = consumerCheck?.consumer === consumer ? consumerCheck : null;
  const consumerReady = /^\d{12}$/.test(consumer) && check?.matched === true && typeof check?.registered === 'boolean';

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(() => { /* Keep motion disabled if the preference cannot be read. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    hintPulse.setValue(0);
    if (!registering || result || accounts.length > 1 || hintSeen || reduceMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(hintPulse, { toValue: 1, duration: 900, useNativeDriver: true, isInteraction: false }),
      Animated.timing(hintPulse, { toValue: 0, duration: 900, useNativeDriver: true, isInteraction: false }),
      Animated.delay(400),
    ]));
    animation.start();
    return () => { animation.stop(); hintPulse.setValue(0); };
  }, [registering, result, accounts.length, hintSeen, reduceMotion, hintPulse]);

  useEffect(() => {
    if (!registering || result || !/^\d{12}$/.test(consumer)) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await authApi.checkConsumer(consumer);
        if (active) setConsumerCheck({ consumer, registered: response.registered, matched: response.matched });
      } catch (error) {
        if (active) setConsumerCheck({ consumer, error: error instanceof Error ? error.message : 'Unable to check Consumer ID.' });
      }
    }, 600);
    return () => { active = false; clearTimeout(timer); };
  }, [consumer, registering, result, checkRetry]);

  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const resetOtp = () => { setRequested(false); setOtp(''); setRemaining(0); setChallengeId(''); setApiError(''); authApi.clearSession(); };
  const change = (key: keyof Details, value: string) => {
    setDetails(current => ({ ...current, [key]: value }));
    setErrors({});
    resetOtp();
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (registering && !details.name.trim()) next.name = 'Enter your full name.';
    if (registering && !/^\d{12}$/.test(details.consumer.trim())) next.consumer = 'Enter the 12-digit Consumer Number on your electricity bill.';
    if (!/^[6-9]\d{9}$/.test(details.phone)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const showError = (error: unknown) => setApiError(error instanceof Error ? error.message : 'Unable to complete this request.');
  const requestOtp = async () => {
    if (busy || !validate()) return;
    setBusy(true); setApiError('');
    try {
      const response = await authApi.requestOtp(details.phone);
      authApi.clearSession();
      setChallengeId(response.challengeId); setRequested(true); setOtp(''); setRemaining(response.retryAfter);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const openAccount = async (account: Account) => {
    setDetails(current => ({ ...current, name: account.name, consumer: account.consumer }));
    setAdminApproved(account.adminApproved);
    if (account.status === 'approved') {
      const approved = await authApi.openOrganization(account.organizationId);
      onComplete({ name: approved.name, consumer: approved.consumer, phone: '+91 ' + details.phone, account: approved });
    } else {
      setResult(account.status);
    }
    setAccounts([]);
  };
  const chooseAccount = async (account: Account) => {
    if (busy) return;
    setBusy(true); setApiError('');
    try { await openAccount(account); } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (busy || !validate()) return;
    if (registering && !acceptedTerms) { setErrors({ consent: 'Accept the Terms and Conditions and registration consent to continue.' }); return; }
    if (registering && !consumerReady) { setErrors({ consumer: 'Wait for the Consumer ID check or retry it.' }); return; }
    if (!requested || !/^\d{6}$/.test(otp)) { setErrors({ otp: 'Request and enter a six-digit OTP.' }); return; }
    setBusy(true); setApiError('');
    try {
      const matches = authApi.hasSession() ? await authApi.accounts() : await authApi.verifyOtp(details.phone, challengeId, otp);
      if (registering) {
        const response = await authApi.register(details.name.trim(), details.consumer.trim(), check?.registered === true);
        setAdminApproved(response.adminApproved); setResult(response.status);
      } else if (matches.length === 1) await openAccount(matches[0]);
      else if (matches.length > 1) setAccounts(matches);
      else { setDetails(current => ({ ...current, consumer: '', name: '' })); setResult('unregistered'); }
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const requestMembership = async () => {
    if (busy || !acceptedTerms) return;
    setBusy(true); setApiError('');
    try {
      const response = await authApi.register(details.name.trim(), details.consumer.trim(), true);
      setAdminApproved(response.adminApproved); setResult(response.status);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  const errorMessage = !!apiError && <Text accessibilityLiveRegion="polite" style={s.error}>{apiError}</Text>;

  if (accounts.length > 1) return <View style={[s.card, a.card]}>
    <Text style={s.pageTitle}>Choose your organization</Text>
    <Text style={s.body}>Your mobile number is linked to more than one electricity connection.</Text>
    {accounts.map(account => <Button key={account.consumer} label={account.consumer} outline disabled={busy} onPress={() => chooseAccount(account)}/>)}
    {errorMessage}
    <Button label="Back to Login" disabled={busy} outline onPress={() => { setAccounts([]); resetOtp(); }}/>
  </View>;

  if (result === 'revoked') return <RevokedAccessScreen consumer={details.consumer} onBack={() => { setMode('login'); setResult(null); setErrors({}); resetOtp(); }} onCheckAccess={async () => {
    const current = (await authApi.accounts()).find(item => item.consumer === details.consumer.trim().toUpperCase());
    if (!current) throw new Error('Your membership is unavailable. Please log in again.');
    if (current.status !== 'revoked') await openAccount(current);
  }}/>;

  if (result) {
    const titles: Record<AccessStatus, string> = {
      'admin-pending': 'Admin access under review',
      existing: 'Consumer ID already registered',
      'member-pending': 'Awaiting organization approval',
      approved: 'You already have access',
      unregistered: 'No registered account found',
      rejected: 'Access request declined',
      revoked: 'Your access has been revoked',
    };
    const descriptions: Record<AccessStatus, string> = {
      'admin-pending': 'Your registration and admin-access request have been received. Our team will verify your organization and your authority to manage it. We will let you know the outcome within 24–48 hours.',
      existing: 'We already have this Consumer ID registered. To join this organization, request approval from your organization admin. Registering with the same Consumer ID does not grant admin access.',
      'member-pending': 'Your access request is awaiting approval from your organization admin. They will assign your role when they approve you.',
      approved: 'This mobile number already has approved access to this Consumer ID. Please log in to continue.',
      unregistered: 'This mobile number is not registered with an organization. Register to request access.',
      rejected: 'Your access request was declined. Contact the Enerbuff team or your organization admin for help.',
      revoked: 'Please contact your organization admin to be added again.',
    };
    const adminNotReady = (result === 'existing' || result === 'member-pending') && !adminApproved;
    return <>
      <View style={s.headingRow}><Pressable accessibilityRole="button" accessibilityLabel="Back to registration" disabled={busy} onPress={() => { setResult(null); resetOtp(); }} style={s.backButton}><Icon name="arrow-back"/></Pressable><Text style={[s.pageTitle, s.flex]}>Organization access</Text></View>
      <View style={[s.card, a.card]}>
        <View style={a.statusIcon}><Icon name={result === 'admin-pending' || result === 'member-pending' ? 'time-outline' : 'business-outline'} size={30}/></View>
        <Text accessibilityRole="header" style={s.pageTitle}>{titles[result]}</Text>
        <Text style={s.body}>{descriptions[result]}</Text>
        <View style={a.summary}>{!!details.consumer && <><Text style={a.label}>Consumer ID</Text><Text style={s.body}>{details.consumer.trim().toUpperCase()}</Text></>}<Text style={a.label}>Mobile number</Text><Text style={s.body}>+91 {details.phone}</Text></View>
        {adminNotReady && <Text style={s.body}>This organization's admin is still being verified. Member requests will wait until an admin is approved.</Text>}
        {(result === 'admin-pending' || result === 'member-pending') && <Text style={a.hint}>You can log in to check your request status. Facility access stays locked until approval.</Text>}
        {result === 'existing' && <Button label="Request organization admin approval" disabled={busy} onPress={requestMembership}/>}
        {errorMessage}
        <Button disabled={busy} label={result === 'unregistered' ? 'Go to Register' : 'Back to Login'} outline onPress={() => { setMode(result === 'unregistered' ? 'register' : 'login'); setResult(null); setErrors({}); resetOtp(); }}/>
      </View>
      <Text style={s.privacy}>Requests are saved to your organization account. Log in to check the outcome. SMS notifications are not enabled yet.</Text>
    </>;
  }

  return <>
    <View style={s.headingRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Get Started" onPress={onBack} disabled={busy} style={s.backButton}><Icon name="arrow-back"/></Pressable>
      <View style={s.flex}><Text style={s.pageTitle}>{registering ? 'Create your account' : 'Welcome back'}</Text><Text style={[s.body, a.subtitle]}>Your next step towards smarter energy savings.</Text></View>
      {registering && <View style={a.hintAnchor}>
        <Animated.View pointerEvents="none" accessible={false} style={[a.hintGlow, { opacity: hintPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }), transform: [{ scale: hintPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] }]}/>
        <Animated.View style={{ transform: [{ scale: hintPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
          <Pressable accessibilityRole="button" accessibilityLabel={showHint ? 'Close registration guide' : 'What do I need to register as an admin?'} accessibilityHint="Shows the details needed for registration and facility setup" accessibilityState={{ expanded: showHint }} onPress={() => { setHintSeen(true); setShowHint(value => !value); }} style={({ pressed }) => [a.hintButton, pressed && { opacity: 0.7 }]}><Icon name={showHint ? 'close' : 'help'} size={24} color={colors.goldText}/></Pressable>
        </Animated.View>
      </View>}
    </View>
    {registering && showHint && <View style={a.guide}>
      <View style={s.rowBetween}><View style={s.flex}><Text style={a.guideEyebrow}>QUICK GUIDE</Text><Text accessibilityRole="header" style={a.guideTitle}>Registering as an admin?</Text></View><Icon name="shield-checkmark-outline" size={30} color={colors.goldText}/></View>
      {([
        { icon: 'person-outline', title: 'Start with your details', body: 'Your full name, Consumer ID from your electricity bill, and your own mobile number. Verify your number with OTP.' },
        { icon: 'time-outline', title: 'Request admin access', body: 'For a new Consumer ID, we review your authority within 24-48 hours. Already registered? Request approval from your organization admin.' },
        { icon: 'clipboard-outline', title: 'After approval, set up your facility', body: 'Keep company details, a recent electricity bill, and equipment names and capacities handy. You will review your facility data and confirm your energy commitment.' },
      ] as const).map((item, index) => <View key={item.title} style={a.guideRow}><View style={a.guideIcon}><Icon name={item.icon} size={19} color={colors.goldText}/></View><View style={s.flex}><Text style={a.guideStep}>{index + 1}. {item.title}</Text><Text style={a.guideBody}>{item.body}</Text></View></View>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Close registration guide and continue" onPress={() => setShowHint(false)} style={a.guideDismiss}><Text style={s.link}>Got it, let's start</Text><Icon name="arrow-forward" size={17}/></Pressable>
    </View>}
    <View style={[s.card, a.card]}>
      <View style={a.tabs}>
        {(['register', 'login'] as const).map(tab => <Pressable key={tab} accessibilityRole="tab" disabled={busy} accessibilityState={{ selected: mode === tab }} style={[a.tab, mode === tab && a.activeTab]} onPress={() => { setMode(tab); setShowHint(false); setErrors({}); resetOtp(); }}><Text style={[a.tabText, mode === tab && a.activeTabText]}>{tab === 'register' ? 'Register' : 'Login'}</Text></Pressable>)}
      </View>
      <Text style={s.body}>{registering ? 'Register your organization and request admin access. Our team will review your eligibility within 24–48 hours. If your Consumer ID is already registered, you can request approval from your organization admin instead.' : 'Use your registered mobile number and OTP to sign in or check your approval status.'}</Text>
      {registering && <View style={a.field}><Text style={a.label}>Full name</Text><TextInput editable={!busy} accessibilityLabel="Full name" autoComplete="name" placeholder="Enter your full name" placeholderTextColor={colors.muted} value={details.name} onChangeText={value => change('name', value)} style={[a.input, !!errors.name && a.invalid]}/>{!!errors.name && <Text accessibilityLiveRegion="polite" style={s.error}>{errors.name}</Text>}</View>}
      {registering && <View style={a.field}><Text style={a.label}>Consumer ID</Text><TextInput editable={!busy} accessibilityLabel="Consumer ID" maxLength={12} keyboardType="number-pad" autoCorrect={false} placeholder="12-digit Consumer Number" placeholderTextColor={colors.muted} value={details.consumer} onChangeText={value => change('consumer', value.replace(/\D/g, ''))} style={[a.input, !!errors.consumer && a.invalid]}/>{!!errors.consumer && <Text accessibilityLiveRegion="polite" style={s.error}>{errors.consumer}</Text>}
        {!!consumer && <Text accessibilityLiveRegion="polite" style={check?.error ? s.error : s.body}>{check?.error ? 'Could not check this Consumer ID. Please retry.' : !/^\d{12}$/.test(consumer) ? 'Enter exactly 12 digits.' : check?.matched === false ? 'Consumer Number not found in our database. Check your electricity bill.' : !consumerReady ? 'Checking Consumer ID...' : check?.registered ? 'This Consumer ID is already registered. Request approval from your organization admin.' : 'Consumer Number matched. Request admin access; our team will review it within 24-48 hours.'}</Text>}
        {!!check?.error && <Pressable accessibilityRole="button" accessibilityLabel="Retry Consumer ID check" disabled={busy} onPress={() => { setConsumerCheck(null); setCheckRetry(value => value + 1); }} style={s.textButton}><Text style={s.link}>Retry check</Text></Pressable>}
      </View>}
      <View style={a.field}><Text style={a.label}>Phone number</Text><View style={[a.phoneRow, !!errors.phone && a.invalid]}><Text style={a.prefix}>+91</Text><TextInput editable={!busy} accessibilityLabel="Phone number" autoComplete="tel-national" keyboardType="phone-pad" maxLength={10} placeholder="10-digit mobile number" placeholderTextColor={colors.muted} value={details.phone} onChangeText={value => change('phone', value.replace(/\D/g, ''))} style={a.phoneInput}/></View>{!!errors.phone && <Text accessibilityLiveRegion="polite" style={s.error}>{errors.phone}</Text>}</View>
      <View style={a.field}>
        <View style={s.rowBetween}><Text style={a.label}>OTP</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: remaining > 0 || busy }} disabled={remaining > 0 || busy} onPress={requestOtp} style={a.otpAction}><Text style={a.otpActionText}>{remaining > 0 ? `Resend in ${remaining}s` : requested ? 'Resend OTP' : 'Get OTP'}</Text></Pressable></View>
        <TextInput accessibilityLabel="Six-digit OTP" autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} editable={requested && !busy} placeholder="Enter 6-digit OTP" placeholderTextColor={colors.muted} value={otp} onChangeText={value => { setOtp(value.replace(/\D/g, '')); setErrors(current => ({ ...current, otp: '' })); }} onSubmitEditing={submit} style={[a.input, a.otpInput, !requested && a.inactive, !!errors.otp && a.invalid]}/>
        {!!errors.otp && <Text accessibilityLiveRegion="polite" style={s.error}>{errors.otp}</Text>}
        {requested && <Text accessibilityLiveRegion="polite" style={a.hint}>Demo OTP ready for +91 {details.phone}. Use {DEMO_OTP}.</Text>}
      </View>
      {errorMessage}
      {registering && <View style={a.field}>
        <View style={a.consentRow}><Pressable accessibilityRole="checkbox" accessibilityLabel="Accept Terms and Conditions and registration consent" accessibilityState={{ checked: acceptedTerms, disabled: busy }} disabled={busy} onPress={() => { setAcceptedTerms(value => !value); setErrors(current => ({ ...current, consent: '' })); }} style={a.checkbox}><Icon name={acceptedTerms ? 'checkbox' : 'square-outline'} size={24}/></Pressable><View style={s.flex}><Text style={s.body}>I agree to the Terms and Conditions and consent to the use of my registration details as described.</Text><Pressable accessibilityRole="button" onPress={() => setShowTerms(true)} style={s.textButton}><Text style={s.link}>Terms and Conditions &amp; registration consent</Text></Pressable></View></View>
        {!!errors.consent && <Text accessibilityLiveRegion="polite" style={s.error}>{errors.consent}</Text>}
      </View>}
      <Button label={busy ? 'Please wait...' : !registering ? 'Verify & Login' : !consumerReady ? (check?.error ? 'Consumer ID check unavailable' : check?.matched === false ? 'Consumer Number not found' : consumer.length !== 12 ? 'Enter 12-digit Consumer Number' : 'Checking Consumer ID...') : check?.registered ? 'Request Organization Admin Approval' : 'Request Admin Access'} onPress={submit} disabled={busy || !requested || otp.length !== 6 || (registering && (!consumerReady || !acceptedTerms))}/>
    </View>
    <View style={a.note}><Icon name="information-circle-outline" size={18} color={colors.muted}/><Text style={[s.body, s.flex]}>Development OTP: {DEMO_OTP} for every mobile number. No SMS is sent. Registration and approval status are saved by the backend.</Text></View>
    <Modal visible={showTerms} transparent animationType="fade" onRequestClose={() => setShowTerms(false)}><View style={s.modalOverlay}><View accessibilityViewIsModal style={[s.modalCard, { maxHeight: '85%' }]}><View style={s.rowBetween}><Text style={[s.sectionTitle, s.flex]}>Terms and Conditions</Text><Pressable accessibilityRole="button" accessibilityLabel="Close Terms and Conditions" onPress={() => setShowTerms(false)} style={a.checkbox}><Icon name="close"/></Pressable></View><ScrollView><Text style={s.body}>Version {REGISTRATION_TERMS_VERSION}</Text>{registrationTerms.map(term => <View key={term.title} style={a.term}><Text style={s.sectionTitle}>{term.title}</Text><Text style={s.body}>{term.body}</Text></View>)}</ScrollView><Button label="Back to registration" onPress={() => setShowTerms(false)}/></View></View></Modal>
  </>;
}

const a = StyleSheet.create({
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkbox: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  term: { gap: 8, paddingVertical: 12 },
  hintAnchor: { width: 44, height: 44, flexShrink: 0 },
  hintGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 22, backgroundColor: colors.gold },
  hintButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  guide: { backgroundColor: colors.goldSoft, borderRadius: 14, padding: 16, gap: 16, borderWidth: 1, borderColor: colors.gold },
  guideEyebrow: { color: colors.goldText, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  guideTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  guideRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  guideIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  guideStep: { color: colors.text, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  guideBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  guideDismiss: { flexDirection: 'row', gap: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderColor: colors.gold },
  statusIcon: { backgroundColor: colors.goldSoft, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  summary: { backgroundColor: colors.background, padding: 12, borderRadius: 8, gap: 6 },
  subtitle: { marginTop: 5 },
  card: { padding: 16, gap: 12 },
  tabs: { flexDirection: 'row', padding: 4, backgroundColor: colors.primarySoft, borderRadius: 9 },
  tab: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  activeTabText: { color: colors.surface },
  field: { gap: 5 },
  label: { fontSize: 12, fontWeight: '600', color: colors.text },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 7, backgroundColor: colors.background },
  prefix: { paddingHorizontal: 12, fontSize: 13, color: colors.text, borderRightWidth: 1, borderColor: colors.border },
  phoneInput: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: colors.text },
  otpAction: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  otpActionText: { color: colors.goldText, fontSize: 12, fontWeight: '600' },
  otpInput: { letterSpacing: 2 },
  inactive: { opacity: 0.5 },
  invalid: { borderColor: colors.error },
  hint: { fontSize: 11, lineHeight: 16, color: colors.success },
  note: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 4 },
});
