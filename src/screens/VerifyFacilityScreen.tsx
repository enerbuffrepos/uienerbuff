import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Factory } from '../Illustrations';
import { Button, Icon, Progress } from '../components/ui';
import { s } from '../styles';
import type { FacilityForm, Screen, Sheet } from '../types';
import ConnectDataScreen from './ConnectDataScreen';

type Props = { readOnly: boolean; mandatory?: boolean; saving?: boolean; matched: boolean; setScreen: (screen: Screen) => void; form: FacilityForm; verify: () => void; connected: boolean; setSheet: (sheet: Sheet) => void };

export default function VerifyFacilityScreen({ readOnly, mandatory = false, saving = false, matched, setScreen, form, verify, connected, setSheet }: Props) {
  const field = (label: string, key: keyof FacilityForm) => <View style={s.field} key={key}><Text style={s.label}>{label}</Text><View style={s.inputRow}><Text selectable style={s.inputValue}>{form[key] || 'Not provided in database'}</Text></View></View>;
  return <>
    <View style={s.headingRow}>{!mandatory && <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={s.backButton} onPress={() => setScreen(5)}><Icon name="arrow-back"/></Pressable>}<View style={s.flex}><Text style={s.pageTitle}>Facility & electricity data</Text><Text style={[s.body, { marginTop: 5 }]}>Details retrieved from the database for your Consumer Number.</Text><Progress step={1}/></View></View>
    <View style={[s.card, s.programme]}><View style={s.miniFactory}><Factory compact/></View><View style={s.flex}><Text style={s.sectionTitle}>Industrial DR Programme</Text></View></View>
    {matched ? <View style={[s.card, s.form]}>{field('Company Name', 'company')}{field('Consumer Number', 'consumer')}{field('DISCOM', 'discom')}{field('Plant Location', 'location')}{field('Official Email', 'email')}{field('Mobile Number', 'mobile')}</View> : <View style={[s.card, s.form]}><Text style={s.error}>No matching database record was found for Consumer Number {form.consumer}. Contact Enerbuff support to correct this organization's Consumer Number.</Text></View>}
    <ConnectDataScreen form={form} connected={connected} setSheet={setSheet}/>
    <Button label={saving ? 'Saving...' : readOnly ? 'View flexible assets' : 'Continue to flexible assets'} disabled={saving || !matched} arrow onPress={() => { if (readOnly) setScreen(3); else verify(); }}/>
  </>;
}
