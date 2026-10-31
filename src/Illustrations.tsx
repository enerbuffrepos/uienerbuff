import { colors } from './theme';
import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Line } from 'react-native-svg';

export function Factory({ compact = false }: { compact?: boolean }) {
  return <Svg width="100%" height="100%" viewBox={compact ? '35 40 310 245' : '0 0 400 315'}>
    <Defs>
      <LinearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#EAF0F7"/><Stop offset="1" stopColor="#A7C3C6"/></LinearGradient>
      <LinearGradient id="steel"><Stop stopColor="#76979F"/><Stop offset=".4" stopColor="#EDF1F6"/><Stop offset="1" stopColor="#72959C"/></LinearGradient>
      <LinearGradient id="energy" x2="0" y2="1"><Stop stopColor="#E2CF80"/><Stop offset="1" stopColor="#A68A25"/></LinearGradient>
    </Defs>
    <Circle cx="246" cy="137" r="118" fill="#F3F2EB"/>
    <Ellipse cx="205" cy="285" rx="186" ry="13" fill="#E9EDF2"/>
    <Path d="M42 278 Q47 240 73 263 Q66 226 87 225 Q105 226 108 270 L334 272 Q341 238 357 252 Q375 249 380 278Z" fill="#BCDCC4"/>
    <Path d="M255 69h26l-8-7-9 2-5-7-11 12h7M139 104h40l-10-9-8 3-5-9-17 15" fill="#D6ECF0"/>
    <Rect x="158" y="95" width="18" height="109" fill="url(#steel)"/><Ellipse cx="167" cy="95" rx="10" ry="3" fill="#68878F"/>
    <Rect x="294" y="79" width="16" height="125" fill="url(#steel)"/><Ellipse cx="302" cy="79" rx="9" ry="3" fill="#68878F"/>
    <Rect x="318" y="139" width="24" height="117" rx="11" fill="url(#energy)"/><Path d="M318 156h24m-24 23h24m-24 25h24" stroke="#806817" strokeWidth="3"/>
    <Path d="M131 238v-75q0-12-12-12h-7v84m18-56h-20m20 20h-20" fill="none" stroke="#507D86" strokeWidth="5"/>
    <Path d="M148 266V137l102-27 51 26v130Z" fill="url(#wall)" stroke="#829EA5" strokeWidth="2"/>
    <Path d="M250 110v157h51V136Z" fill="#A3BEC2"/>
    <Path d="m146 137 104-29 53 27" fill="none" stroke="#4E7683" strokeWidth="4"/>
    {[165,190,215].map(x => <G key={x}><Rect x={x} y="153" width="16" height="10" fill="#537E8E"/><Rect x={x} y="180" width="16" height="10" fill="#759BA6"/></G>)}
    <Path d="M77 275v-63l126-35v98Z" fill="#E5EAF0" stroke="#93B0AE" strokeWidth="2"/><Path d="m74 211 129-37v8L76 218Z" fill="#547F87"/>
    {[88,111,134,157,180].map(x => <Rect key={x} x={x} y={231-(x-88)*.25} width="14" height="11" fill="#4E7B87"/>)}
    <Rect x="114" y="247" width="38" height="28" fill="#305F65"/><Line x1="133" y1="247" x2="133" y2="275" stroke="#84A5A5" strokeWidth="2"/>
    <Path d="M56 278q-1-20 12-20t13 20m102 0q-3-31 11-31t16 31m9 0q-3-23 10-23t16 23" fill="#74B48C"/>
    {!compact && <G><Circle cx="247" cy="50" r="30" fill="url(#energy)"/><Path d="m250 29-16 25h12l-3 20 18-29h-13Z" fill="white"/><Path d="M247 83v14h-42v29" stroke={colors.gold} strokeDasharray="4 4" fill="none"/></G>}
  </Svg>;
}

export function MeterArt() {
  return <Svg width="100%" height="100%" viewBox="0 0 250 180">
    <Ellipse cx="124" cy="158" rx="115" ry="10" fill="#EAF0F7"/>
    <Path d="M25 155Q4 119 15 119q17 0 19 35m182 0q24-44 12-44-14 0-16 43" fill="#B5DCC5"/>
    <Path d="M50 69V34h137v34" fill="none" stroke={colors.gold} strokeDasharray="4 4"/>
    <Rect x="87" y="66" width="140" height="89" rx="6" fill="#DEE7E9" stroke="#9AAFB6"/><Rect x="93" y="72" width="128" height="77" rx="3" fill="#FFFFFF"/>
    {[0,1,2,3,4,5,6].map((n) => <Rect key={n} x={105+n*15} y={132-n*4} width="8" height={12+n*4} fill={n===6?'#C4A52D':'#CDD8E6'}/>)}
    <Path d="m104 109 12-9 13 3 13-14 14 7 13-4 14-15" stroke={colors.primary} strokeWidth="2" fill="none"/>
    <Rect x="22" y="67" width="57" height="78" rx="9" fill="#CBDADD" stroke="#8EA4AC"/><Rect x="28" y="74" width="45" height="52" rx="5" fill="#EDF3F3"/><Rect x="33" y="81" width="35" height="18" rx="3" fill="#91ABB7"/>
    {[36,48,60].map(x=><Rect key={x} x={x} y="107" width="6" height="4" rx="1" fill="#527082"/>)}
    <Path d="M44 145v13h15v-13" fill="#74969D"/>
    <Circle cx="110" cy="32" r="20" fill={colors.primary}/><Path d="m114 17-14 18h10l-3 13 15-20h-11Z" fill="white"/>
    <Circle cx="206" cy="88" r="9" fill={colors.success}/><Path d="m202 88 3 3 5-6" fill="none" stroke="white" strokeWidth="2"/>
  </Svg>;
}
