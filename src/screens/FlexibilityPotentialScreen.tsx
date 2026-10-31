import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Button, Icon, IconBubble, Progress, type IconName } from '../components/ui';
import LoadChart from '../components/LoadChart';
import { estimatedPotential, recommendedCommitment } from '../data';
import { colors as c } from '../theme';
import { s } from '../styles';
import { e } from './energyStyles';
import type { Asset, Screen, Sheet } from '../types';

type Props = { readOnly: boolean; mandatory?: boolean; saving?: boolean; assets: Asset[]; commitment: number; setCommitment: (value: number) => void; setScreen: (screen: Screen) => void; setSheet: (sheet: Sheet) => void; onApprove: () => void };
export default function FlexibilityPotentialScreen({readOnly,mandatory=false,saving=false,assets,commitment,setCommitment,setScreen,setSheet,onApprove}: Props) {
  const max = estimatedPotential(assets);
  const min = Math.min(50,max);
  const [trackWidth,setTrackWidth] = useState(1);
  const update = (value:number) => !readOnly && setCommitment(Math.min(max,Math.max(min,Math.round(value/10)*10)));
  const fraction = max===min ? 0 : (commitment-min)/(max-min);
  const updatePosition = (x:number) => update(min+Math.max(0,Math.min(1,x/trackWidth))*(max-min));
  const stats: {icon:IconName;label:string;value:string}[] = [
    {icon:'flash',label:'Estimated flexible demand',value:`${max} kW`},
    {icon:'shield-checkmark',label:'Recommended safe commitment',value:`${recommendedCommitment(assets)} kW`},
    {icon:'time-outline',label:'Best flexibility window',value:'18:00–21:00'},
  ];
  return <>
    <Pressable accessibilityRole="button" onPress={()=>setScreen(3)} style={s.backLink}><Icon name="arrow-back" size={18}/><Text style={s.backLinkText}>Flexible assets</Text></Pressable>
    <View style={e.spread}><View style={s.flex}><Text style={e.title}>Your flexibility potential</Text><Text style={e.small}>An estimate of the demand your facility can safely offer.</Text></View><View style={{width:90}}><Progress step={3}/></View></View>
    <View style={[e.card,e.row,{alignItems:'stretch'}]}>{stats.map(stat=><View key={stat.label} style={e.stat}><IconBubble name={stat.icon} small/><Text style={e.statLabel}>{stat.label}</Text><Text style={[e.value,{fontSize:17}]}>{stat.value}</Text></View>)}</View>
    <View style={e.card}><View style={e.spread}><Text style={e.label}>{readOnly?'Safe commitment':'Set your safe commitment'}</Text><Text style={[e.label,e.gold]}>{commitment} kW</Text></View>
      <View accessible accessibilityRole="adjustable" accessibilityLabel="Safe commitment in kilowatts" accessibilityState={{disabled:readOnly}} accessibilityValue={{min,max,now:commitment}} accessibilityActions={readOnly?[]:[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={event=>update(commitment+(event.nativeEvent.actionName==='increment'?10:-10))} onLayout={event=>setTrackWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={()=>!readOnly} onMoveShouldSetResponder={()=>!readOnly} onResponderGrant={event=>updatePosition(event.nativeEvent.locationX)} onResponderMove={event=>updatePosition(event.nativeEvent.locationX)} style={e.track}>
        <View pointerEvents="none" style={e.rail}><View style={[e.fill,{width:`${fraction*100}%`}]}/></View><View pointerEvents="none" style={[e.thumb,{left:`${fraction*100}%`}]}/>
      </View>
      <View style={e.spread}><Text style={e.small}>{min} kW</Text><View style={e.row}><Pressable accessibilityRole="button" disabled={readOnly} accessibilityState={{disabled:readOnly}} accessibilityLabel="Decrease commitment" onPress={()=>update(commitment-10)} style={e.stepper}><Icon name="remove" size={16}/></Pressable><Pressable accessibilityRole="button" disabled={readOnly} accessibilityState={{disabled:readOnly}} accessibilityLabel="Increase commitment" onPress={()=>update(commitment+10)} style={e.stepper}><Icon name="add" size={16}/></Pressable></View><Text style={e.small}>{max} kW</Text></View>
    </View>
    <View style={e.card}><Text style={e.label}>Typical daily load</Text><LoadChart/></View>
    <View style={e.card}><Text style={e.label}>Why this recommendation</Text>{[
      ['stats-chart','Based on smart-meter history','This preview uses an illustrative daily load profile. Live estimates will require verified meter history.'],
      ['business','Aligned with selected assets',`${assets.filter(a=>a.selected&&!a.critical).length} flexible assets are selected. The preview estimates two-thirds of their capacity as flexible demand.`],
      ['shield-checkmark','Avoids production-critical loads','Critical assets are excluded. Confirm operating constraints with your facility team before real participation.'],
    ].map(([icon,title,body])=><Pressable accessibilityRole="button" key={title} style={e.row} onPress={()=>setSheet({title,body})}><Icon name={icon as IconName} size={18}/><Text style={[e.small,s.flex]}>{title}</Text><Icon name="chevron-forward" size={16}/></Pressable>)}</View>
    <Text style={e.small}>Demo estimate · Your approved commitment is saved to your facility.</Text>
    {!readOnly && <Button label={saving?'Saving commitment...':`Approve ${commitment} kW`} arrow disabled={saving || commitment<=0} onPress={onApprove}/>}{!mandatory && <Button label={readOnly?"Back to dashboard":"Adjust Later"} outline disabled={saving} onPress={()=>setScreen(5)}/>}
  </>;
}
