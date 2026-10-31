import { colors } from '../theme';
import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Factory } from '../Illustrations';
import { Button, Icon, IconBubble, type IconName } from '../components/ui';
import { s } from '../styles';
import type { Screen, Sheet } from '../types';

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: 'trending-up', title: 'Reduce peak &\nToD costs', body: 'Shift or reduce approved loads during high-cost periods.' },
  { icon: 'shield-checkmark', title: 'Stay in control', body: 'You decide which assets are flexible and when to participate.' },
  { icon: 'ribbon', title: 'Earn verified\nincentives', body: 'Smart-meter based measurement and transparent settlement.' },
];
const steps: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shield-checkmark', title: 'Verify Facility', body: 'Submit basic details and complete verification.' },
  { icon: 'business', title: 'Identify Flexible Assets', body: 'We help you find eligible and flexible loads.' },
  { icon: 'calendar', title: 'Join Events', body: 'Choose events that suit your operations.' },
  { icon: 'document-text', title: 'Get Verified Results', body: 'Performance is measured and incentives settled.' },
];

type Props = {
  setScreen: (screen: Screen) => void;
  setSheet: (sheet: Sheet) => void;
};

export default function HomeScreen({ setScreen, setSheet }: Props) {
  return <>
  <View style={s.hero}><View style={s.heroCopy}><Text style={s.title}>Turn your electrical{ '\n' }flexibility into <Text style={s.accent}>savings.</Text></Text><Text style={[s.body,s.heroDescription]}>Identify flexible loads, participate in demand response events, and earn incentives without affecting production.</Text></View><View style={s.factory}><Factory/></View><View style={s.impactCard}><View style={s.rowBetween}><Text style={s.microLabel}>Energy impact</Text><Text style={s.savings}>↗ Savings</Text></View><View style={s.chart}>{[12,18,15,26,22,33,38,35,48,54,51,65].map((h,i)=><View key={i} style={{flex:1,height:h*.6,backgroundColor:i>8?colors.gold:colors.primarySoft,borderTopLeftRadius:2,borderTopRightRadius:2}}/>)}</View><View style={s.impactBottom}><View><Text style={s.microLabel}>Incentives earned</Text><Text style={s.earnings}>₹ 12,45,000</Text></View><Icon name="checkmark-circle" size={19} color={colors.success}/></View></View></View>
  <View style={s.featureRow}>{features.map(f=><View key={f.title} style={[s.card,s.featureCard]}><IconBubble name={f.icon}/><Text style={s.featureTitle}>{f.title}</Text><Text style={s.featureBody}>{f.body}</Text></View>)}</View>
  <View style={[s.card,s.howCard]}><Text style={s.sectionTitle}>How it works</Text><View style={s.steps}>{steps.map((item,i)=><View key={item.title} style={s.step}><IconBubble name={item.icon}/>{i<3 && <View style={s.stepConnector}><Text style={{color:colors.border}}>····›</Text></View>}<View style={s.stepNumber}><Text style={s.stepNumberText}>{i+1}</Text></View><Text style={s.stepTitle}>{item.title}</Text><Text style={s.stepBody}>{item.body}</Text></View>)}</View></View>
  <Button label="Get Started" arrow onPress={()=>setScreen('auth')}/><Pressable accessibilityRole="link" accessibilityLabel="Check our website" onPress={() => { void Linking.openURL('https://www.enerbuff.com/').catch(() => setSheet({ title: 'Unable to open website', body: 'Please visit https://www.enerbuff.com/ in your browser.' })); }} style={s.textButton}><Text style={s.link}>Check our website</Text></Pressable>

  </>;
}
