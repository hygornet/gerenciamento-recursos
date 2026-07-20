export type ResourceStatus = "Ativo" | "Férias" | "Inativo";
export type EngagementType = "Projeto" | "Serviço gerenciado";
export type EngagementStatus = "Planejamento" | "Em andamento" | "Em risco" | "Concluído";
export type EngagementHealth = "OK" | "Ponto de atenção" | "Crítico";
export type FollowUpCategory = "Atualização" | "Ponto de atenção" | "Gap" | "Risco" | "Decisão" | "Próximo passo";
export type FollowUpStatus = "Aberto" | "Em acompanhamento" | "Resolvido";
export type CertificationLevel = "Fundamental" | "Associate" | "Expert" | "Specialty";
export type ClientStatus = "Ativo" | "Inativo";

export interface Skill {
  name: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  proficiency?: string;
}

export interface Resource {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  status: ResourceStatus;
  weeklyCapacity: number;
  allocatedHours: number;
  skills: Skill[];
  experienceYears?: number | null;
  capacityStatus?: string;
  certifications?: string;
  growthGoal?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  document: string;
  contactName: string;
  email: string;
  phone: string;
  status: ClientStatus;
  notes: string;
  createdAt?: string;
}

export interface Allocation {
  resourceId: string;
  hours: number;
  role?: string;
  percentage?: number;
  sourceStatus?: string;
  offerType?: string;
}

export interface EngagementUpdate {
  id: string;
  engagementId: string;
  occurredOn: string;
  category: FollowUpCategory;
  status: FollowUpStatus;
  note: string;
  author: string;
  createdAt?: string;
}

export interface Engagement {
  id: string;
  name: string;
  clientId: string;
  client: string;
  type: EngagementType;
  status: EngagementStatus;
  startDate: string;
  endDate: string;
  contractedHours: number;
  consumedHours: number;
  description: string;
  requiredSkills?: string;
  currentStatus?: string;
  health?: EngagementHealth;
  consultantSnapshot?: string;
  allocations: Allocation[];
  updates?: EngagementUpdate[];
  createdAt?: string;
}

export interface Certification {
  id: string;
  code: string;
  name: string;
  level: CertificationLevel;
  renewalMonths: number;
  holders: number;
  createdAt?: string;
}

export interface PortalData {
  resources: Resource[];
  clients: Client[];
  engagements: Engagement[];
  certifications: Certification[];
}

export type ResourceInput = Omit<Resource, "id" | "createdAt" | "allocatedHours">;
export type ClientInput = Omit<Client, "id" | "createdAt">;
export type EngagementInput = Omit<Engagement, "id" | "createdAt" | "updates">;
export type EngagementUpdateInput = Omit<EngagementUpdate, "id" | "engagementId" | "createdAt">;
export type CertificationInput = Omit<Certification, "id" | "createdAt" | "holders"> & { holders?: number };