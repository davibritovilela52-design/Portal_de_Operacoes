export type PortalRole =
  | 'portal_admin'
  | 'central_operations'
  | 'yachts_operations'
  | 'asset_field_team';

export type AccessRosterEntry = {
  email: string;
  userId: string;
  displayName: string;
  role: PortalRole;
  mfaEnabled: boolean;
  assetNames: string[];
};

export const assetAliases: Record<string, string> = {
  solar: 'Solar I'
};

// The requested business groups map onto the existing internal permission model.
export const requestedRoster: AccessRosterEntry[] = [
  {
    email: 'mondebleu@primeyou.com.br',
    userId: 'embarcacoes-yacht-mondebleu',
    displayName: 'Mondebleu',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Mondebleu']
  },
  {
    email: 'alcazar@primeyou.com.br',
    userId: 'embarcacoes-yacht-alcazar',
    displayName: 'Alcazar',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Alcazar']
  },
  {
    email: 'zhou@primeyou.com.br',
    userId: 'embarcacoes-yacht-zhou',
    displayName: 'Zhou',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Zhou']
  },
  {
    email: 'sapphire@primeyou.com.br',
    userId: 'embarcacoes-yacht-sapphire',
    displayName: 'Sapphire',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Sapphire']
  },
  {
    email: 'solar@primeyou.com.br',
    userId: 'embarcacoes-yacht-solar',
    displayName: 'Solar I',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Solar']
  },
  {
    email: 'carapituba@primeyou.com.br',
    userId: 'embarcacoes-yacht-carapituba',
    displayName: 'Carapituba',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Carapituba']
  },
  {
    email: 'fratelli@primeyou.com.br',
    userId: 'embarcacoes-yacht-fratelli',
    displayName: 'Fratelli',
    role: 'asset_field_team',
    mfaEnabled: false,
    assetNames: ['Fratelli']
  },
  {
    email: 'sfouyer@primeyou.com.br',
    userId: 'operacoes-yachts-sfouyer',
    displayName: 'S. Fouyer',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'sgomes@primeyou.com.br',
    userId: 'operacoes-yachts-sgomes',
    displayName: 'S. Gomes',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'mecanica@primeyou.com.br',
    userId: 'operacoes-yachts-mecanica',
    displayName: 'Mecanica',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'eletrica@primeyou.com.br',
    userId: 'operacoes-yachts-eletrica',
    displayName: 'Eletrica',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'hidraulica@primeyou.com.br',
    userId: 'operacoes-yachts-hidraulica',
    displayName: 'Hidraulica',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'manutencaoyachts@primerealestate.com.br',
    userId: 'operacoes-yachts-manutencao',
    displayName: 'Manutencao Yachts',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'dvecchi@primeyou.com.br',
    userId: 'operacoes-dvecchi',
    displayName: 'D. Vecchi',
    role: 'central_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'operacoes.realestate.yachts@primeyou.com',
    userId: 'operacoes-real-estate-yachts',
    displayName: 'Operações - Real Estate e Yachts',
    role: 'central_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'mgarcia@primeyou.com.br',
    userId: 'operacoes-mgarcia',
    displayName: 'M. Garcia',
    role: 'central_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'fsouza@primeyou.com.br',
    userId: 'operacoes-fsouza',
    displayName: 'F. Souza',
    role: 'yachts_operations',
    mfaEnabled: true,
    assetNames: []
  },
  {
    email: 'vcarvalho@primeyou.com.br',
    userId: 'operacoes-vcarvalho',
    displayName: 'V. Carvalho',
    role: 'central_operations',
    mfaEnabled: true,
    assetNames: []
  }
];

export const legacyEmailsToRevoke = [
  'alcazar.field@primeyou.com',
  'carapituba.field@primeyou.com',
  'central.ops@primeyou.test',
  'fratelli.field@primeyou.com',
  'mondebleu.field@primeyou.com',
  'portal.admin@primeyou.com',
  'sapphire.field@primeyou.com',
  'solari.field@primeyou.com',
  'tech.yachts@primeyou.test',
  'zhou.field@primeyou.com'
];
