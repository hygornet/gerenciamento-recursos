export type ResourceStatus = "Ativo" | "Férias" | "Inativo";
export type EngagementType = "Projeto" | "Serviço gerenciado";
export type EngagementStatus = "Planejamento" | "Em andamento" | "Em risco" | "Concluído";
export type CertificationLevel = "Fundamental" | "Associate" | "Expert" | "Specialty";
export type ClientStatus = "Ativo" | "Inativo";

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
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
  allocations: Allocation[];
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
export type EngagementInput = Omit<Engagement, "id" | "createdAt">;
export type CertificationInput = Omit<Certification, "id" | "createdAt" | "holders"> & { holders?: number };
