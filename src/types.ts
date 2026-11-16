export type ScreenType = 'splash1' | 'splash2' | 'portals' | 'admin' | 'teachers' | 'learners' | 'parents';

export type PortalId = 'admin' | 'staff' | 'parents' | 'learners';

export interface PortalConfig {
  id: PortalId;
  name: string;
  shortTitle: string;
  accentColor: string;
  securityPrompt: string;
  credentialType: 'adminCode' | 'phone' | 'admNumber';
  credentialPlaceholder: string;
  sampleCredential: string;
  description: string;
  features: string[];
  roleBadge: string;
}
