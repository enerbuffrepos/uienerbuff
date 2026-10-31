import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';
import { Icon, IconBubble, type IconName } from '../components/ui';
import LoadChart from '../components/LoadChart';
import { Factory } from '../Illustrations';
import { estimatedPotential } from '../data';
import { colors as c } from '../theme';
import { s } from '../styles';
import { e } from './energyStyles';
import type { Asset, FacilityForm, Screen, Sheet } from '../types';

type Props = { readOnly: boolean; form: FacilityForm; assets: Asset[]; approvedCommitment: number | null; setScreen: (screen: Screen) => void; setSheet: (sheet: Sheet) => void };
function MiniChart({ bars = false }: {bars?:boolean}) {
  return <Svg width="100%" height={24} viewBox="0 0 120 24" preserveAspectRatio="none">{bars ? [3,6,4,8,5,10,9,14,12,18,16,22].map((h,i)=><Rect key={i} x={i*10} y={24-h} width={6} height={h} fill={i>8?c.gold:c.primary} opacity={i>8?1:0.4}/>) : <Polyline points="0,20 8,18 16,21 24,16 32,17 40,12 48,13 56,7 64,10 72,5 80,7 88,3 96,8 104,4 112,6 120,2" fill="none" stroke={c.primary} strokeWidth={1.5}/>}</Svg>;
}
export default function DashboardScreen({readOnly,form,assets,approvedCommitment,setScreen,setSheet}: Props) {
  const [yesterday,setYesterday] = useState(false);
  const capacity = Math.round(estimatedPotential(assets)*.75);
  const metrics: {icon:IconName;label:string;value:string;unit:string;bars?:boolean}[] = [
    {icon:'pulse',label:'Current Demand',value:'1.48',unit:'MW'},
    {icon:'trending-up',label:'Expected Peak',value:'1.82',unit:'MW'},
    {icon:'flash',label:'Flexible Capacity',value:String(capacity),unit:'kW',bars:true},
    {icon:'cash-outline',label:'Potential ToD Saving',value:`₹${(capacity*10).toLocaleString('en-IN')}`,unit:'',bars:true},
  ];
  return <>
    <View style={e.hero}><View style={e.factory}><Factory/></View><Text style={e.title}>Good evening,{ '\n' }{form.company.replace(/ Pvt\. Ltd\.$/,'')}</Text><Text style={[e.small,{marginTop:9}]}>Your plant is ready for demand response.</Text></View>
    <View style={e.spread}><Text style={e.small}>Facility overview</Text><Text style={[s.demoTag,e.gold]}>DEMO DATA</Text></View>
    <View style={e.metricGrid}>{metrics.map(metric=><View key={metric.label} style={e.metric}><IconBubble name={metric.icon} small/><Text style={e.small}>{metric.label}</Text><Text style={e.value}>{metric.value} <Text style={e.small}>{metric.unit}</Text></Text><MiniChart bars={metric.bars}/></View>)}</View>
    <Pressable accessibilityRole="button" style={[e.card,e.row]} onPress={()=>setSheet({title:'Demand response status',body:'There is no active event. Eligible programme invitations will appear here in the live service. No equipment is controlled by this preview.'})}><Icon name="shield-checkmark" size={34} color={c.success}/><View style={s.flex}><View style={[e.row,{flexWrap:'wrap'}]}><Text style={e.label}>DR Status</Text><Text style={[e.small,{color:c.success}]}>No active event</Text></View><Text style={e.small}>You will be notified when an eligible event is available.</Text></View><Icon name="chevron-forward" size={17}/></Pressable>
    <View style={e.card}><View style={e.spread}><Text style={e.label}>{yesterday?'Yesterday’s':'Today’s'} demand profile</Text><Pressable accessibilityRole="button" accessibilityLabel="Change demand profile day" onPress={()=>setYesterday(!yesterday)} style={[e.tag,e.row]}><Text style={e.small}>{yesterday?'Yesterday':'Today'}</Text><Icon name="chevron-down" size={12}/></Pressable></View><LoadChart dashboard yesterday={yesterday}/></View>
    <View style={[e.row,{alignItems:'stretch'}]}><Pressable accessibilityRole="button" style={[e.card,s.flex]} onPress={()=>setSheet({title:'Next best action',body:assets.some(a=>a.id==='pump'&&a.selected)?'Consider shifting the water-pump cycle after 9:00 PM to avoid the illustrated peak period. Confirm storage levels and production requirements with your team. This is a sample suggestion; no schedule has been changed.':'Review the operating windows of your selected flexible assets with your team. This preview has not changed any equipment schedules.'})}><Icon name="time-outline" color={c.goldText}/><Text style={e.label}>Next best action</Text><Text style={e.small}>{assets.some(a=>a.id==='pump'&&a.selected)?'Shift pump cycle after 9:00 PM to reduce peak-period cost.':'Review operating windows for your selected assets.'}</Text><Text style={[e.small,e.gold]}>View details ›</Text></Pressable><Pressable accessibilityRole="button" style={[e.card,s.flex]} onPress={()=>setSheet({title:'Recent performance · Demo',body:'Sample participation rate: 84% across 7 events.\n\nLast verified event: 186 kWh.\n\nThese figures demonstrate the report layout and are not measured facility results.'})}><Icon name="bar-chart"/><Text style={e.label}>Recent performance</Text><Text style={e.small}>Participation rate</Text><Text style={e.value}>84% <Text style={[e.small,{color:c.success}]}>↑ 8%</Text></Text><Text style={e.small}>Last verified event: 186 kWh</Text></Pressable></View>
    <Pressable accessibilityRole="button" style={[e.card,e.spread]} onPress={()=>setScreen(4)}><View style={s.flex}><Text style={e.label}>{approvedCommitment===null?(readOnly?'View safe commitment':'Set your safe commitment'):`Approved commitment: ${approvedCommitment} kW`}</Text><Text style={e.small}>{approvedCommitment===null?(readOnly?'Only your organization admin can update this step.':'You can complete this step when ready.'):'Saved to your facility. Tap to review.'}</Text></View><Icon name="chevron-forward" size={18}/></Pressable>
  </>;
}
export function DashboardNavigation({setScreen,setSheet,onProfile,activeTab='Home',disabled=false}: Pick<Props,'setScreen'|'setSheet'> & { onProfile: () => void; activeTab?: 'Home' | 'Assets' | 'Profile'; disabled?: boolean }) {
  const tabs: {label:string;icon:IconName;onPress:()=>void}[] = [
    {label:'Home',icon:'home',onPress:()=>setScreen(5)},
    {label:'Events',icon:'calendar-outline',onPress:()=>setSheet({title:'Demand response events',body:'No active events. Eligible invitations and event schedules will appear here in the live programme.'})},
    {label:'Assets',icon:'business-outline',onPress:()=>setScreen(3)},
    {label:'Reports',icon:'bar-chart-outline',onPress:()=>setSheet({title:'Performance reports · Demo',body:'Participation: 84% across 7 sample events.\nLast verified event: 186 kWh.\n\nLive settlement reports and downloads will appear here when available.'})},
    {label:'Profile',icon:'person-outline',onPress:onProfile},
  ];
  return <View style={e.footer}>{tabs.map(tab=><Pressable accessibilityRole="tab" disabled={disabled} accessibilityState={{selected:tab.label===activeTab,disabled}} key={tab.label} style={e.tab} onPress={tab.onPress}><Icon name={tab.icon} color={tab.label===activeTab?c.primary:c.muted} size={22}/><Text style={[e.small,{color:tab.label===activeTab?c.primary:c.muted}]}>{tab.label}</Text></Pressable>)}</View>;
}
