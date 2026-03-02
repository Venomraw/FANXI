export interface FormationLayout {
  name: string;
  label: string;       // e.g. "4-3-3"
  slots: string[][];   // rows from attack to defense (top → bottom on pitch)
}

export const FORMATIONS: FormationLayout[] = [
  {
    name: '4-3-3',
    label: '4-3-3',
    slots: [
      ['LW', 'ST', 'RW'],
      ['LCM', 'CM', 'RCM'],
      ['LB', 'CB1', 'CB2', 'RB'],
      ['GK'],
    ],
  },
  {
    name: '4-2-3-1',
    label: '4-2-3-1',
    slots: [
      ['ST'],
      ['LAM', 'CAM', 'RAM'],
      ['CDM1', 'CDM2'],
      ['LB', 'CB1', 'CB2', 'RB'],
      ['GK'],
    ],
  },
  {
    name: '4-4-2',
    label: '4-4-2',
    slots: [
      ['ST1', 'ST2'],
      ['LM', 'LCM', 'RCM', 'RM'],
      ['LB', 'CB1', 'CB2', 'RB'],
      ['GK'],
    ],
  },
  {
    name: '3-5-2',
    label: '3-5-2',
    slots: [
      ['ST1', 'ST2'],
      ['LWB', 'LCM', 'CM', 'RCM', 'RWB'],
      ['CB1', 'CB2', 'CB3'],
      ['GK'],
    ],
  },
  {
    name: '5-3-2',
    label: '5-3-2',
    slots: [
      ['ST1', 'ST2'],
      ['LCM', 'CM', 'RCM'],
      ['LWB', 'CB1', 'CB2', 'CB3', 'RWB'],
      ['GK'],
    ],
  },
];

export const DEFAULT_FORMATION = FORMATIONS[0]; // 4-3-3
