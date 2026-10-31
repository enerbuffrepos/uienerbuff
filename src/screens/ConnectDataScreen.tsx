import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon, IconBubble, type IconName } from '../components/ui';
import { colors } from '../theme';
import { s } from '../styles';
import type { FacilityForm, Sheet } from '../types';

type Props = { form: FacilityForm; connected: boolean; setSheet: (sheet: Sheet) => void };
export default function ConnectDataScreen({ form, connected, setSheet }: Props) {
  const sources: { icon: IconName; title: string; body: string; badge: string; detail: string }[] = [
    { icon: 'hardware-chip-outline', title: 'Smart Meter Data', body: '30-min interval data', badge: connected ? 'Connected' : 'Available', detail: `Provider: ${form.discom}\n\nSmart-meter readings support flexibility assessment and performance measurement. Live meter integration is not enabled in this preview.` },
    { icon: 'document-text-outline', title: 'Billing & Tariff', body: 'Tariff structure and historical bills', badge: 'Optional', detail: 'Billing and tariff information helps estimate savings from shifting electricity use. Historical bill uploads will be available with the live integration.' },
  ];
  return <>
    <Text style={s.sectionTitle}>Electricity data</Text>
    {sources.map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={() => setSheet({ title: item.title, body: item.detail })} style={[s.card, s.dataCard]}><IconBubble name={item.icon}/><View style={s.flex}><Text style={s.dataTitle}>{item.title}</Text><Text style={s.dataBody}>{item.body}</Text></View><View style={s.badge}><Text style={s.badgeText}>{item.badge}</Text></View><Icon name="chevron-forward" size={19} color={colors.muted}/></Pressable>)}
  </>;
}
