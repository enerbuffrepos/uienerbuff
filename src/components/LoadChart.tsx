import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Line, Rect, Text, Circle } from 'react-native-svg';
import { colors as c } from '../theme';

const daily = [120,115,95,92,78,88,72,75,105,110,185,215,205,190,205,195,210,190,200,190,215,220,275,330,365,440,455,410,400,330,265,235,170,150];
const demand = [0.6,0.52,0.33,0.29,0.7,0.81,1.1,1.07,0.94,0.99,1.37,1.4,1.58,1.23,1.19,1.45,1.58,1.64,1.6,1.7,1.48,1.3,1.28,1.43,1.91,1.82,1.55,1.45,1.05,0.92,0.85];

export default function LoadChart({ dashboard = false, yesterday = false }: { dashboard?: boolean; yesterday?: boolean }) {
  const values = (dashboard ? demand : daily).map(v => yesterday ? v * 0.88 : v);
  const max = dashboard ? 2 : 500;
  const points = values.map((v, i) => [32 + i * 306 / (values.length - 1), 126 - v / max * 100]);
  const path = (p: number[][]) => p.map(([x,y],i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const split = dashboard && !yesterday ? 21 : points.length - 1;
  const actual = points.slice(0, split + 1);
  return <View accessible accessibilityLabel={dashboard ? `${yesterday ? 'Yesterday' : 'Today'} demo demand profile, actual demand in navy and forecast in gold.` : 'Demo daily load chart. Best flexibility window is 18:00 to 21:00.'}>
    <Svg width="100%" height={174} viewBox="0 0 350 164">
      {!dashboard && <Rect x={261} y={23} width={39} height={103} fill={c.goldSoft}/>}
      {[0,1,2,3,4,5].map(i => <React.Fragment key={i}><Line x1={32} x2={338} y1={126-i*20} y2={126-i*20} stroke={c.border} strokeWidth={0.5}/><Text x={25} y={129-i*20} textAnchor="end" fontSize={8} fill={c.muted}>{dashboard ? (i * .4).toFixed(1) : i*100}</Text></React.Fragment>)}
      <Text x={8} y={15} fontSize={8} fill={c.muted}>{dashboard ? 'MW' : 'kW'}</Text>
      <Path d={`${path(actual)} L${actual[actual.length-1][0]},126 L32,126 Z`} fill={c.primarySoft} opacity={0.65}/>
      <Path d={path(actual)} stroke={c.primary} strokeWidth={1.8} fill="none"/>
      {dashboard && !yesterday && <><Path d={path(points.slice(split))} stroke={c.goldText} strokeWidth={1.5} strokeDasharray="4 3" fill="none"/><Line x1={points[split][0]} x2={points[split][0]} y1={22} y2={126} stroke={c.gold} strokeDasharray="3 3"/><Circle cx={points[split][0]} cy={points[split][1]} r={3} fill={c.primary}/></>}
      {(dashboard ? ['12 AM','4 AM','8 AM','12 PM','4 PM','8 PM','12 AM'] : ['00:00','04:00','08:00','12:00','16:00','20:00','24:00']).map((label,i) => <Text key={i} x={32+i*51} y={142} fontSize={8} textAnchor="middle" fill={c.muted}>{label}</Text>)}
      <Text x={175} y={159} fontSize={8} textAnchor="middle" fill={c.goldText}>{dashboard ? '— Actual     - - Forecast · Demo data' : 'Gold area: best flexibility window'}</Text>
    </Svg>
  </View>;
}
