import type { Asset } from './types';

export const initialAssets: Asset[] = [
  { id: 'chiller', name: 'Chiller', kw: 180, flexibility: 'Can reduce for 30 min', selected: true, critical: false, icon: 'snow' },
  { id: 'compressor', name: 'Compressor', kw: 120, flexibility: 'Can shift operation', selected: true, critical: false, icon: 'cog' },
  { id: 'pump', name: 'Water Pump', kw: 80, flexibility: 'Can delay 60 min', selected: true, critical: false, icon: 'water' },
  { id: 'hvac', name: 'HVAC', kw: 100, flexibility: 'Can reduce 20%', selected: true, critical: false, icon: 'thermometer' },
  { id: 'furnace', name: 'Furnace', kw: 600, flexibility: 'Critical / Non-flexible', selected: false, critical: true, icon: 'flame' },
  { id: 'production', name: 'Production Line', kw: 900, flexibility: 'Critical / Non-flexible', selected: false, critical: true, icon: 'business' },
];

export const selectedLoad = (assets: Asset[]) => assets.reduce((sum, asset) => sum + (!asset.critical && asset.selected ? asset.kw : 0), 0);
// Illustrative estimates for this UI preview, not an operational recommendation.
export const estimatedPotential = (assets: Asset[]) => Math.round(selectedLoad(assets) * 2 / 3);
export const recommendedCommitment = (assets: Asset[]) => Math.min(estimatedPotential(assets), Math.max(50, Math.floor(estimatedPotential(assets) * 0.625 / 10) * 10));
