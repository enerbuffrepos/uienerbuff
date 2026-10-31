export type FacilityForm = {
  company: string;
  consumer: string;
  discom: string;
  location: string;
  email: string;
  mobile: string;
};
export type Sheet = { title: string; body: string; kind?: 'discom' | 'location' | 'success' } | null;
export type Screen = 0 | 1 | 2 | 3 | 4 | 5 | 'auth' | 'team-access';

export type Asset = {
  id: string;
  name: string;
  kw: number;
  flexibility: string;
  selected: boolean;
  critical: boolean;
  icon: 'snow' | 'cog' | 'water' | 'thermometer' | 'flame' | 'business';
};
