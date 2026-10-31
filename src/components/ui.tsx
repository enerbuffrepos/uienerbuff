import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme';
import { s } from '../styles';
export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = colors.primary }: { name: IconName; size?: number; color?: string }) { return <Ionicons name={name} size={size} color={color}/>; }
export function IconBubble({ name, small = false }: { name: IconName; small?: boolean }) { return <View style={[s.bubble, small && s.smallBubble]}><Icon name={name} size={small ? 23 : 29}/></View>; }
export function Button({ label, onPress, outline = false, arrow = false, disabled = false }: { label: string; onPress: () => void; outline?: boolean; arrow?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, outline && s.outlineButton, disabled && { opacity: .4 }, pressed && { opacity: .75 }]}><Text style={[s.buttonText, outline && { color: colors.primary }]}>{label}</Text>{arrow && <View style={s.buttonArrow}><Icon name="arrow-forward" color="white" size={22}/></View>}</Pressable>;
}
export function Progress({ step }: { step: number }) { return <View style={s.progress}><Text style={s.stepText}>Step {step} <Text style={s.muted}>of 3</Text></Text><View style={s.progressTrack}>{[1,2,3].map(i=><View key={i} style={[s.progressSegment, i <= step && { backgroundColor: colors.gold }]}/>)}</View></View>; }
