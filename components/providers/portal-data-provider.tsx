"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { demoData } from "@/lib/demo-data";
import { getSupabaseClient, getSupabaseConfigurationError, isDemoModeEnabled } from "@/lib/supabase";
import type {
  Certification,
  CertificationInput,
  Client,
  ClientInput,
  Engagement,
  EngagementInput,
  EngagementUpdate,
  EngagementUpdateInput,
  PortalData,
  Resource,
  ResourceInput,
} from "@/lib/types";

interface PortalContextValue extends PortalData {
  loading: boolean;
  loadError: string;
  configurationError: string;
  isDemo: boolean;
  addResource: (input: ResourceInput) => Promise<void>;
  updateResource: (id: string, input: ResourceInput) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  addClient: (input: ClientInput) => Promise<void>;
  updateClient: (id: string, input: ClientInput) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addEngagement: (input: EngagementInput) => Promise<void>;
  updateEngagement: (id: string, input: EngagementInput) => Promise<void>;
  deleteEngagement: (id: string) => Promise<void>;
  addEngagementUpdate: (engagementId: string, input: EngagementUpdateInput) => Promise<void>;
  updateEngagementUpdate: (id: string, input: EngagementUpdateInput) => Promise<void>;
  deleteEngagementUpdate: (id: string) => Promise<void>;
  addCertification: (input: CertificationInput) => Promise<void>;
  updateCertification: (id: string, input: CertificationInput) => Promise<void>;
  deleteCertification: (id: string) => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);
const STORAGE_KEY = "nexo-portal-data-v2";
const EMPTY_DATA: PortalData = { resources: [], clients: [], engagements: [], certifications: [] };

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function deriveAllocatedHours(source: PortalData): PortalData {
  const totals = new Map<string, number>();
  source.engagements
    .filter((engagement) => engagement.status !== "Concluído")
    .forEach((engagement) => engagement.allocations.forEach((allocation) => {
      totals.set(allocation.resourceId, (totals.get(allocation.resourceId) ?? 0) + allocation.hours);
    }));

  return {
    ...source,
    resources: source.resources.map((resource) => ({ ...resource, allocatedHours: totals.get(resource.id) ?? 0 })),
  };
}

function normalizeDemoData(source: PortalData): PortalData {
  const resourceIdsByIdentity = new Map<string, string>();
  const duplicateResourceIds = new Map<string, string>();
  const resources = source.resources.filter((resource) => {
    const email = resource.email.trim().toLowerCase();
    const identity = email || `name:${resource.name.trim().toLowerCase()}`;
    const existingId = resourceIdsByIdentity.get(identity);
    if (!existingId) {
      resourceIdsByIdentity.set(identity, resource.id);
      return true;
    }
    duplicateResourceIds.set(resource.id, existingId);
    return false;
  });
  const clients = source.clients ?? demoData.clients;
  const engagements = source.engagements.map((engagement) => {
    const allocations = new Map<string, { hours: number; role?: string }>();
    engagement.allocations.forEach((allocation) => {
      const resourceId = duplicateResourceIds.get(allocation.resourceId) ?? allocation.resourceId;
      const previous = allocations.get(resourceId);
      allocations.set(resourceId, { hours: (previous?.hours ?? 0) + allocation.hours, role: allocation.role || previous?.role });
    });
    return {
      ...engagement,
      clientId: engagement.clientId ?? clients.find((client) => client.name === engagement.client)?.id ?? "",
      updates: engagement.updates ?? [],
      allocations: Array.from(allocations, ([resourceId, allocation]) => ({ resourceId, ...allocation })),
    };
  });

  return deriveAllocatedHours({ ...source, resources, clients, engagements });
}

export function PortalDataProvider({ children }: { children: ReactNode }) {
  const isDemo = isDemoModeEnabled();
  const configurationError = getSupabaseConfigurationError();
  const [data, setData] = useState<PortalData>(() => isDemo ? normalizeDemoData(demoData) : EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshData = useCallback(async () => {
    if (configurationError) {
      setData(EMPTY_DATA);
      setLoadError(configurationError);
      setLoading(false);
      return;
    }

    if (isDemo) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setData(normalizeDemoData(JSON.parse(saved) as PortalData));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          setData(normalizeDemoData(demoData));
        }
      }
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    const [resourcesResult, clientsResult, engagementsResult, certificationsResult] = await Promise.all([
      supabase.from("resources").select("*, resource_skills(skill_name, level, proficiency)"),
      supabase.from("clients").select("*"),
      supabase.from("engagements").select("*, allocations(resource_id, hours, role, allocation_percentage, source_status, offer_type), engagement_updates(*)"),
      supabase.from("certifications").select("*"),
    ]);
    const error = resourcesResult.error ?? clientsResult.error ?? engagementsResult.error ?? certificationsResult.error;
    if (error) {
      setData(EMPTY_DATA);
      setLoadError("Não foi possível carregar os dados. Confirme se as migrations foram aplicadas e se o usuário possui acesso.");
      setLoading(false);
      return;
    }

    setData(deriveAllocatedHours({
      resources: (resourcesResult.data ?? []).map(mapResource),
      clients: (clientsResult.data ?? []).map(mapClient),
      engagements: (engagementsResult.data ?? []).map(mapEngagement),
      certifications: (certificationsResult.data ?? []).map(mapCertification),
    }));
    setLoading(false);
  }, [configurationError, isDemo]);

  useEffect(() => {
    void refreshData();
    if (isDemo || configurationError) return;

    const supabase = getSupabaseClient()!;
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setData(EMPTY_DATA);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        window.setTimeout(() => void refreshData(), 0);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [configurationError, isDemo, refreshData]);

  function saveLocal(next: PortalData) {
    const normalized = normalizeDemoData(next);
    setData(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  function ensureUniqueResourceEmail(input: ResourceInput, currentId?: string) {
    const email = input.email.trim().toLowerCase();
    if (!email) return;
    if (data.resources.some((resource) => resource.id !== currentId && resource.email.trim().toLowerCase() === email)) {
      throw new Error("Já existe um recurso cadastrado com este e-mail.");
    }
  }

  async function saveResource(id: string | null, input: ResourceInput) {
    const { error } = await getSupabaseClient()!.rpc("save_resource", {
      p_resource_id: id,
      p_name: input.name,
      p_email: input.email,
      p_role: input.role,
      p_location: input.location,
      p_status: input.status,
      p_weekly_capacity: input.weeklyCapacity,
      p_experience_years: input.experienceYears ?? null,
      p_capacity_status: input.capacityStatus ?? "",
      p_certifications: input.certifications ?? "",
      p_growth_goal: input.growthGoal ?? "",
      p_skills: input.skills,
    });
    if (error) throw error;
    await refreshData();
  }

  async function addResource(input: ResourceInput) {
    ensureUniqueResourceEmail(input);
    if (isDemo) return saveLocal({ ...data, resources: [{ ...input, id: newId("r"), allocatedHours: 0 }, ...data.resources] });
    await saveResource(null, input);
  }

  async function updateResource(id: string, input: ResourceInput) {
    ensureUniqueResourceEmail(input, id);
    if (isDemo) return saveLocal({ ...data, resources: data.resources.map((item) => item.id === id ? { ...item, ...input } : item) });
    await saveResource(id, input);
  }

  async function deleteResource(id: string) {
    if (isDemo) return saveLocal({
      ...data,
      resources: data.resources.filter((item) => item.id !== id),
      engagements: data.engagements.map((engagement) => ({ ...engagement, allocations: engagement.allocations.filter((allocation) => allocation.resourceId !== id) })),
    });
    const { error } = await getSupabaseClient()!.from("resources").delete().eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function saveEngagement(id: string | null, input: EngagementInput) {
    const { error } = await getSupabaseClient()!.rpc("save_engagement", {
      p_engagement_id: id,
      p_client_id: input.clientId,
      p_name: input.name,
      p_client: input.client,
      p_type: input.type,
      p_status: input.status,
      p_start_date: input.startDate || null,
      p_end_date: input.endDate || null,
      p_contracted_hours: input.contractedHours,
      p_consumed_hours: input.consumedHours,
      p_description: input.description,
      p_required_skills: input.requiredSkills ?? "",
      p_current_status: input.currentStatus ?? "",
      p_health: input.health ?? "OK",
      p_consultant_snapshot: input.consultantSnapshot ?? "",
      p_allocations: input.allocations.map((allocation) => ({ resource_id: allocation.resourceId, hours: allocation.hours, role: allocation.role ?? "", allocation_percentage: allocation.percentage ?? null, source_status: allocation.sourceStatus ?? "", offer_type: allocation.offerType ?? input.type })),
    });
    if (error) throw error;
    await refreshData();
  }

  async function addEngagement(input: EngagementInput) {
    if (isDemo) return saveLocal({ ...data, engagements: [{ ...input, id: newId("e"), updates: [] }, ...data.engagements] });
    await saveEngagement(null, input);
  }

  async function updateEngagement(id: string, input: EngagementInput) {
    if (isDemo) return saveLocal({ ...data, engagements: data.engagements.map((item) => item.id === id ? { ...item, ...input } : item) });
    await saveEngagement(id, input);
  }

  async function deleteEngagement(id: string) {
    if (isDemo) return saveLocal({ ...data, engagements: data.engagements.filter((item) => item.id !== id) });
    const { error } = await getSupabaseClient()!.from("engagements").delete().eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function addEngagementUpdate(engagementId: string, input: EngagementUpdateInput) {
    if (isDemo) {
      const update: EngagementUpdate = { ...input, id: newId("u"), engagementId, createdAt: new Date().toISOString() };
      return saveLocal({ ...data, engagements: data.engagements.map((item) => item.id === engagementId ? { ...item, updates: [update, ...(item.updates ?? [])] } : item) });
    }
    const { error } = await getSupabaseClient()!.from("engagement_updates").insert(toEngagementUpdateRow(engagementId, input));
    if (error) throw error;
    await refreshData();
  }

  async function updateEngagementUpdate(id: string, input: EngagementUpdateInput) {
    if (isDemo) {
      return saveLocal({ ...data, engagements: data.engagements.map((engagement) => ({
        ...engagement,
        updates: (engagement.updates ?? []).map((item) => item.id === id ? { ...item, ...input } : item),
      })) });
    }
    const { error } = await getSupabaseClient()!.from("engagement_updates").update(toEngagementUpdateRow(undefined, input)).eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function deleteEngagementUpdate(id: string) {
    if (isDemo) {
      return saveLocal({ ...data, engagements: data.engagements.map((engagement) => ({ ...engagement, updates: (engagement.updates ?? []).filter((item) => item.id !== id) })) });
    }
    const { error } = await getSupabaseClient()!.from("engagement_updates").delete().eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function addClient(input: ClientInput) {
    if (isDemo) return saveLocal({ ...data, clients: [{ ...input, id: newId("cl") }, ...data.clients] });
    const { error } = await getSupabaseClient()!.from("clients").insert(toClientRow(input));
    if (error) throw error;
    await refreshData();
  }

  async function updateClient(id: string, input: ClientInput) {
    if (isDemo) return saveLocal({ ...data, clients: data.clients.map((item) => item.id === id ? { ...item, ...input } : item), engagements: data.engagements.map((item) => item.clientId === id ? { ...item, client: input.name } : item) });
    const { error } = await getSupabaseClient()!.from("clients").update(toClientRow(input)).eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function deleteClient(id: string) {
    if (isDemo) return saveLocal({ ...data, clients: data.clients.filter((item) => item.id !== id) });
    const { error } = await getSupabaseClient()!.from("clients").delete().eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function addCertification(input: CertificationInput) {
    if (isDemo) return saveLocal({ ...data, certifications: [{ ...input, id: newId("c"), holders: input.holders ?? 0 }, ...data.certifications] });
    const { error } = await getSupabaseClient()!.from("certifications").insert(toCertificationRow(input));
    if (error) throw error;
    await refreshData();
  }

  async function updateCertification(id: string, input: CertificationInput) {
    if (isDemo) return saveLocal({ ...data, certifications: data.certifications.map((item) => item.id === id ? { ...item, ...input, holders: input.holders ?? item.holders } : item) });
    const { error } = await getSupabaseClient()!.from("certifications").update(toCertificationRow(input)).eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  async function deleteCertification(id: string) {
    if (isDemo) return saveLocal({ ...data, certifications: data.certifications.filter((item) => item.id !== id) });
    const { error } = await getSupabaseClient()!.from("certifications").delete().eq("id", id);
    if (error) throw error;
    await refreshData();
  }

  return <PortalContext.Provider value={{
    ...data,
    loading,
    loadError,
    configurationError,
    isDemo,
    addResource,
    updateResource,
    deleteResource,
    addClient,
    updateClient,
    deleteClient,
    addEngagement,
    updateEngagement,
    deleteEngagement,
    addEngagementUpdate,
    updateEngagementUpdate,
    deleteEngagementUpdate,
    addCertification,
    updateCertification,
    deleteCertification,
  }}>{children}</PortalContext.Provider>;
}

export function usePortalData() {
  const context = useContext(PortalContext);
  if (!context) throw new Error("usePortalData must be used inside PortalDataProvider");
  return context;
}

function mapResource(row: Record<string, unknown>): Resource {
  const skills = (row.resource_skills ?? []) as Array<{ skill_name: string; level: number; proficiency?: string }>;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email ?? ""),
    role: String(row.role),
    location: String(row.location ?? "Remoto"),
    status: row.status as Resource["status"],
    weeklyCapacity: Number(row.weekly_capacity),
    allocatedHours: 0,
    skills: skills.map((skill) => ({ name: skill.skill_name, level: skill.level as Resource["skills"][number]["level"], proficiency: skill.proficiency || undefined })),
    experienceYears: row.experience_years === null || row.experience_years === undefined ? null : Number(row.experience_years),
    capacityStatus: String(row.capacity_status ?? ""),
    certifications: String(row.certifications ?? ""),
    growthGoal: String(row.growth_goal ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapClient(row: Record<string, unknown>): Client {
  return { id: String(row.id), name: String(row.name), document: String(row.document ?? ""), contactName: String(row.contact_name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), status: row.status as Client["status"], notes: String(row.notes ?? ""), createdAt: String(row.created_at ?? "") };
}

function mapEngagement(row: Record<string, unknown>): Engagement {
  const allocations = (row.allocations ?? []) as Array<{ resource_id: string; hours: number; role?: string; allocation_percentage?: number | null; source_status?: string; offer_type?: string }>;
  const updates = ((row.engagement_updates ?? []) as Array<Record<string, unknown>>).map(mapEngagementUpdate).sort((a, b) => {
    const dateOrder = b.occurredOn.localeCompare(a.occurredOn);
    return dateOrder || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });
  return {
    id: String(row.id),
    name: String(row.name),
    clientId: String(row.client_id),
    client: String(row.client),
    type: row.type as Engagement["type"],
    status: row.status as Engagement["status"],
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    contractedHours: Number(row.contracted_hours),
    consumedHours: Number(row.consumed_hours),
    description: String(row.description ?? ""),
    requiredSkills: String(row.required_skills ?? ""),
    currentStatus: String(row.current_status ?? ""),
    health: (row.health ?? "OK") as Engagement["health"],
    consultantSnapshot: String(row.consultant_snapshot ?? ""),
    allocations: allocations.map((allocation) => ({ resourceId: allocation.resource_id, hours: Number(allocation.hours), role: allocation.role ?? "", percentage: allocation.allocation_percentage === null || allocation.allocation_percentage === undefined ? undefined : Number(allocation.allocation_percentage), sourceStatus: allocation.source_status ?? "", offerType: allocation.offer_type ?? "" })),
    updates,
    createdAt: String(row.created_at ?? ""),
  };
}

function mapEngagementUpdate(row: Record<string, unknown>): EngagementUpdate {
  return {
    id: String(row.id),
    engagementId: String(row.engagement_id),
    occurredOn: String(row.occurred_on),
    category: row.category as EngagementUpdate["category"],
    status: row.status as EngagementUpdate["status"],
    note: String(row.note),
    author: String(row.author),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapCertification(row: Record<string, unknown>): Certification {
  return { id: String(row.id), code: String(row.code), name: String(row.name), level: row.level as Certification["level"], renewalMonths: Number(row.renewal_months), holders: Number(row.holders ?? 0) };
}

function toCertificationRow(input: CertificationInput) {
  return { code: input.code, name: input.name, level: input.level, renewal_months: input.renewalMonths, holders: input.holders ?? 0 };
}

function toClientRow(input: ClientInput) {
  return { name: input.name, document: input.document, contact_name: input.contactName, email: input.email, phone: input.phone, status: input.status, notes: input.notes };
}

function toEngagementUpdateRow(engagementId: string | undefined, input: EngagementUpdateInput) {
  return {
    ...(engagementId ? { engagement_id: engagementId } : {}),
    occurred_on: input.occurredOn,
    category: input.category,
    status: input.status,
    note: input.note,
    author: input.author,
  };
}