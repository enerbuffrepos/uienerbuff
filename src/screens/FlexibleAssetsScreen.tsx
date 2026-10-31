import React, { useState } from 'react';
import { View, Text, Switch, TextInput, Pressable } from 'react-native';
import { Button, Icon, Progress } from '../components/ui';
import { Factory } from '../Illustrations';
import { colors as c } from '../theme';
import { s } from '../styles';
import { e } from './energyStyles';
import { selectedLoad } from '../data';
import type { Asset, Screen } from '../types';

type Props = { readOnly: boolean; saving?: boolean; assets: Asset[]; setAssets: React.Dispatch<React.SetStateAction<Asset[]>>; setScreen: (screen: Screen) => void; onSave: () => void };
export default function FlexibleAssetsScreen({ readOnly, saving = false, assets, setAssets, setScreen, onSave }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [kw, setKw] = useState('');
  const [error, setError] = useState('');
  const total = selectedLoad(assets);
  const critical = assets.filter(a => a.critical).reduce((sum,a) => sum+a.kw,0);
  const add = () => {
    if (readOnly) return;
    const value = Number(kw);
    if (!name.trim() || !Number.isFinite(value) || value < 1 || value > 100000) { setError('Enter an asset name and capacity between 1 and 100,000 kW.'); return; }
    setAssets(current => [...current, { id: `custom-${Date.now()}`, name: name.trim(), kw: Math.round(value), selected: true, critical: false, flexibility: 'Team-approved load', icon: 'cog' }]);
    setName(''); setKw(''); setError(''); setAdding(false);
  };
  return <>
    <View style={e.row}><Pressable accessibilityRole="button" accessibilityLabel="Back to facility and data" onPress={()=>setScreen(1)} style={s.backButton}><Icon name="arrow-back"/></Pressable><View style={s.flex}><Progress step={2}/></View></View>
    <Text style={e.title}>Identify <Text style={e.gold}>flexible assets</Text></Text>
    <Text style={s.body}>Select only the loads your team considers safe and flexible.</Text>
    <View style={[e.card,e.note,e.row]}><Icon name="shield-checkmark" size={31}/><View style={s.flex}><Text style={e.label}>Your team remains in control.</Text><Text style={e.small}>Critical loads stay non-flexible.</Text></View><View style={{width:85,height:55}}><Factory compact/></View></View>
    <View style={[e.card,{paddingVertical:0}]}>{assets.map(asset => <View key={asset.id} style={e.asset}>
      <View style={e.assetIcon}><Icon name={asset.icon} size={26}/></View><View style={e.assetName}><Text style={e.label}>{asset.name}</Text><Text style={e.small}>{asset.kw} kW</Text></View>
      <View style={[e.tag,asset.critical && e.danger]}><Text style={[e.small,{color:asset.critical ? c.error : c.goldText}]}>{asset.flexibility}</Text></View>
      {!asset.critical && <Switch disabled={readOnly} accessibilityLabel={`Include ${asset.name} as a flexible asset`} value={asset.selected} trackColor={{false:c.border,true:c.primary}} thumbColor={c.surface} onValueChange={selected=>setAssets(current=>current.map(a=>a.id===asset.id?{...a,selected}:a))}/>}
    </View>)}</View>
    <View style={[e.card,e.row]}><View style={e.totals}><Text style={e.small}>Selected flexible load</Text><Text style={e.value}>{total} kW</Text></View><View style={[e.totals,e.danger]}><Text style={e.small}>Critical load excluded</Text><Text style={[e.value,{color:c.error}]}>{(critical/1000).toFixed(1)} MW</Text></View></View>
    {!readOnly && total===0 && <Text style={s.error}>Select at least one flexible asset to continue.</Text>}
    {readOnly ? <Button label="View flexibility potential" onPress={()=>setScreen(4)}/> : <Button label={saving?'Saving assets...':'Save Flexible Assets'} disabled={saving || total===0} onPress={onSave}/>}
    {!readOnly && <Button label={adding?'Cancel Custom Asset':'+ Add Custom Asset'} outline onPress={()=>setAdding(!adding)}/>}
    {!readOnly && adding && <View style={e.card}><Text style={e.label}>Add a team-approved flexible asset</Text><TextInput accessibilityLabel="Asset name" placeholder="Asset name" placeholderTextColor={c.muted} value={name} onChangeText={setName} style={e.field}/><TextInput accessibilityLabel="Asset capacity in kW" placeholder="Capacity (kW)" placeholderTextColor={c.muted} value={kw} onChangeText={setKw} keyboardType="numeric" style={e.field}/>{!!error && <Text style={s.error}>{error}</Text>}<Button label="Add Asset" onPress={add}/></View>}
  </>;
}
