import type { AgendaEventRecord } from './portal-model';

export type AgendaEventEmphasis = 'default' | 'warning' | 'critical';

export type AgendaEventColorTheme = {
  accent: string;
  border: string;
  borderHover: string;
  surface: string;
  surfaceHover: string;
  title: string;
  subtitle: string;
};

const agendaEventColorThemes: AgendaEventColorTheme[] = [
  {
    accent: '#5eead4',
    border: 'rgba(94, 234, 212, 0.34)',
    borderHover: 'rgba(94, 234, 212, 0.52)',
    surface: 'rgba(45, 212, 191, 0.14)',
    surfaceHover: 'rgba(45, 212, 191, 0.22)',
    title: '#e5fffb',
    subtitle: 'rgba(229, 255, 251, 0.72)'
  },
  {
    accent: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.34)',
    borderHover: 'rgba(56, 189, 248, 0.54)',
    surface: 'rgba(56, 189, 248, 0.13)',
    surfaceHover: 'rgba(56, 189, 248, 0.22)',
    title: '#e0f6ff',
    subtitle: 'rgba(224, 246, 255, 0.72)'
  },
  {
    accent: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.34)',
    borderHover: 'rgba(245, 158, 11, 0.54)',
    surface: 'rgba(245, 158, 11, 0.13)',
    surfaceHover: 'rgba(245, 158, 11, 0.22)',
    title: '#fff3db',
    subtitle: 'rgba(255, 243, 219, 0.72)'
  },
  {
    accent: '#fb7185',
    border: 'rgba(251, 113, 133, 0.34)',
    borderHover: 'rgba(251, 113, 133, 0.52)',
    surface: 'rgba(251, 113, 133, 0.13)',
    surfaceHover: 'rgba(251, 113, 133, 0.21)',
    title: '#ffe4e8',
    subtitle: 'rgba(255, 228, 232, 0.72)'
  },
  {
    accent: '#a3e635',
    border: 'rgba(163, 230, 53, 0.34)',
    borderHover: 'rgba(163, 230, 53, 0.52)',
    surface: 'rgba(163, 230, 53, 0.13)',
    surfaceHover: 'rgba(163, 230, 53, 0.21)',
    title: '#f3ffd9',
    subtitle: 'rgba(243, 255, 217, 0.72)'
  },
  {
    accent: '#f97316',
    border: 'rgba(249, 115, 22, 0.34)',
    borderHover: 'rgba(249, 115, 22, 0.52)',
    surface: 'rgba(249, 115, 22, 0.13)',
    surfaceHover: 'rgba(249, 115, 22, 0.21)',
    title: '#ffe9d8',
    subtitle: 'rgba(255, 233, 216, 0.72)'
  },
  {
    accent: '#22d3ee',
    border: 'rgba(34, 211, 238, 0.34)',
    borderHover: 'rgba(34, 211, 238, 0.54)',
    surface: 'rgba(34, 211, 238, 0.13)',
    surfaceHover: 'rgba(34, 211, 238, 0.22)',
    title: '#e0fcff',
    subtitle: 'rgba(224, 252, 255, 0.72)'
  },
  {
    accent: '#34d399',
    border: 'rgba(52, 211, 153, 0.34)',
    borderHover: 'rgba(52, 211, 153, 0.54)',
    surface: 'rgba(52, 211, 153, 0.13)',
    surfaceHover: 'rgba(52, 211, 153, 0.22)',
    title: '#e3fff2',
    subtitle: 'rgba(227, 255, 242, 0.72)'
  },
  {
    accent: '#eab308',
    border: 'rgba(234, 179, 8, 0.34)',
    borderHover: 'rgba(234, 179, 8, 0.54)',
    surface: 'rgba(234, 179, 8, 0.13)',
    surfaceHover: 'rgba(234, 179, 8, 0.22)',
    title: '#fff7d1',
    subtitle: 'rgba(255, 247, 209, 0.72)'
  },
  {
    accent: '#60a5fa',
    border: 'rgba(96, 165, 250, 0.34)',
    borderHover: 'rgba(96, 165, 250, 0.54)',
    surface: 'rgba(96, 165, 250, 0.13)',
    surfaceHover: 'rgba(96, 165, 250, 0.22)',
    title: '#e1efff',
    subtitle: 'rgba(225, 239, 255, 0.72)'
  }
];

export function buildAgendaAssetColorThemeMap(
  assetIds: string[]
): Map<string, AgendaEventColorTheme> {
  const uniqueAssetIds = [...new Set(assetIds)];

  return new Map(
    uniqueAssetIds.map((assetId, index) => [
      assetId,
      agendaEventColorThemes[index % agendaEventColorThemes.length]
    ])
  );
}

export function resolveAgendaEventColorTheme(assetId: string): AgendaEventColorTheme {
  const index = resolveAgendaThemeIndex(assetId);

  return agendaEventColorThemes[index];
}

export function resolveAgendaEventEmphasis(
  event: Pick<AgendaEventRecord, 'type' | 'provisional'>
): AgendaEventEmphasis {
  if (
    event.type === 'emergency_maintenance' ||
    (event.type === 'operational_block' && event.provisional)
  ) {
    return 'critical';
  }

  if (event.type === 'crew_rest') {
    return 'warning';
  }

  return 'default';
}

function resolveAgendaThemeIndex(assetId: string) {
  const numericSuffix = assetId.match(/(\d+)(?!.*\d)/)?.[1];

  if (numericSuffix) {
    return (Number.parseInt(numericSuffix, 10) - 1) % agendaEventColorThemes.length;
  }

  return hashValue(assetId) % agendaEventColorThemes.length;
}

function hashValue(input: string) {
  let hash = 0;

  for (const character of input.trim().toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}
