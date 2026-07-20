"use client";

import { useState, type FormEvent } from "react";
import { BriefcaseBusiness, CalendarDays, Clock3, Edit3, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { usePortalData } from "@/components/providers/portal-data-provider";
import { Modal } from "@/components/ui/modal";
import type { Engagement, Resource, ResourceInput, ResourceStatus, Skill } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function statusClass(status: ResourceStatus) {
  if (status === "Ativo") return "status-active";
  if (status === "Férias") return "status-vacation";
  return "status-inactive";
}

function engagementStatusClass(status: Engagement["status"]) {
  if (status === "Em andamento") return "status-active";
  if (status === "Em risco") return "status-risk";
  if (status === "Planejamento") return "status-planning";
  return "status-complete";
}

export function ResourcesPage() {
  const { resources, engagements, addResource, updateResource, deleteResource } = usePortalData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [editing, setEditing] = useState<Resource | null | undefined>(undefined);
  const [viewing, setViewing] = useState<Resource | null>(null);

  const filtered = resources.filter((resource) => {
    const matchesText = `${resource.name} ${resource.email} ${resource.role} ${resource.skills.map((skill) => skill.name).join(" ")}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (status === "Todos" || resource.status === status);
  });

  async function remove(resource: Resource) {
    const projects = engagements.filter((engagement) => engagement.allocations.some((allocation) => allocation.resourceId === resource.id)).length;
    if (!window.confirm(projects ? `${resource.name} está em ${projects} entrega(s). Excluir mesmo assim?` : `Excluir ${resource.name}?`)) return;
    try { await deleteResource(resource.id); } catch { window.alert("Não foi possível excluir o recurso."); }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><div className="page-eyebrow">Equipe / Diretório</div><h1 className="page-title">Recursos</h1><p className="page-subtitle">Skills, disponibilidade e contexto de alocação do seu time.</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => setEditing(null)}><UserPlus />Novo recurso</button></div>
      </header>
      <div className="toolbar">
        <div className="toolbar-left">
          <label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, função ou skill" aria-label="Buscar recursos" /></label>
          <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status"><option>Todos</option><option>Ativo</option><option>Férias</option><option>Inativo</option></select>
        </div>
        <div className="toolbar-right"><span className="result-count">{filtered.length} de {resources.length} recursos</span></div>
      </div>

      <section className="data-card">
        {filtered.length ? (
          <table className="data-table">
            <thead><tr><th>Recurso</th><th>Status</th><th>Skills</th><th>Projetos</th><th>Capacity semanal</th><th aria-label="Ações" /></tr></thead>
            <tbody>
              {filtered.map((resource) => {
                const percentage = resource.weeklyCapacity ? Math.round(resource.allocatedHours / resource.weeklyCapacity * 100) : 0;
                const projects = engagements.filter((engagement) => engagement.allocations.some((allocation) => allocation.resourceId === resource.id)).length;
                const tone = percentage > 100 ? "danger" : percentage >= 90 ? "warning" : "";
                return (
                  <tr className="clickable-row" key={resource.id} tabIndex={0} aria-label={`Ver alocações de ${resource.name}`} onClick={() => setViewing(resource)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setViewing(resource); } }}>
                    <td><div className="table-person"><div className="avatar">{initials(resource.name)}</div><div><strong>{resource.name}</strong><span>{resource.role} · {resource.location}</span></div></div></td>
                    <td><span className={`status ${statusClass(resource.status)}`}>{resource.status}</span></td>
                    <td><div className="skill-list">{resource.skills.slice(0, 3).map((skill) => <span className="skill-tag" key={skill.name}>{skill.name}<span className="skill-level">L{skill.level}</span></span>)}{resource.skills.length > 3 && <span className="skill-tag">+{resource.skills.length - 3}</span>}</div></td>
                    <td><span className="project-count"><BriefcaseBusiness />{projects}</span></td>
                    <td><div className="capacity-cell"><div className="capacity-cell-head"><span>{resource.allocatedHours}h / {resource.weeklyCapacity}h</span><strong>{percentage}%</strong></div><div className="capacity-track"><div className={`capacity-fill ${tone}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div></div></td>
                    <td><div className="table-actions"><button className="table-action" aria-label={`Editar ${resource.name}`} onClick={(event) => { event.stopPropagation(); setEditing(resource); }}><Edit3 /></button><button className="table-action delete" aria-label={`Excluir ${resource.name}`} onClick={(event) => { event.stopPropagation(); void remove(resource); }}><Trash2 /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <div className="empty-state"><div className="empty-state-icon"><Users /></div><h3>Nenhum recurso encontrado</h3><p>Ajuste os filtros ou cadastre uma nova pessoa.</p></div>}
      </section>

      {editing !== undefined && <ResourceForm resource={editing} onClose={() => setEditing(undefined)} onSave={async (input) => { if (editing) await updateResource(editing.id, input); else await addResource(input); setEditing(undefined); }} />}
      {viewing && <ResourceQuickView resource={viewing} engagements={engagements} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ResourceQuickView({ resource, engagements, onClose }: { resource: Resource; engagements: Engagement[]; onClose: () => void }) {
  const assignments = engagements
    .flatMap((engagement) => {
      const allocation = engagement.allocations.find((item) => item.resourceId === resource.id);
      return allocation ? [{ engagement, hours: allocation.hours }] : [];
    })
    .sort((a, b) => Number(a.engagement.status === "Concluído") - Number(b.engagement.status === "Concluído"));
  const activeAssignments = assignments.filter(({ engagement }) => engagement.status !== "Concluído");
  const availableHours = resource.weeklyCapacity - resource.allocatedHours;
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <Modal title={resource.name} description={`${resource.role} · ${resource.location}`} onClose={onClose} wide footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>}>
      <div className="resource-quick-summary">
        <div><span>Capacidade</span><strong>{resource.weeklyCapacity}h</strong><small>por semana</small></div>
        <div><span>Alocado agora</span><strong>{resource.allocatedHours}h</strong><small>{activeAssignments.length} entrega(s) ativa(s)</small></div>
        <div className={availableHours < 0 ? "negative" : ""}><span>Disponibilidade</span><strong>{availableHours}h</strong><small>{availableHours < 0 ? "acima da capacidade" : "livres por semana"}</small></div>
      </div>
      <div className="resource-quick-heading"><div><span>Mapa de atuação</span><h3>Projetos &amp; SGs</h3></div><span>{assignments.length} vínculo(s)</span></div>
      {assignments.length ? <div className="resource-assignment-list">{assignments.map(({ engagement, hours }) => (
        <article className={`resource-assignment ${engagement.status === "Concluído" ? "completed" : ""}`} key={engagement.id}>
          <div className="resource-assignment-rail" />
          <div className="resource-assignment-main"><div className="resource-assignment-top"><span>{engagement.type}</span><span className={`status ${engagementStatusClass(engagement.status)}`}>{engagement.status}</span></div><h4>{engagement.name}</h4><p>{engagement.client}</p><div className="resource-assignment-period"><span><CalendarDays />{dateFormatter.format(new Date(engagement.startDate))} → {dateFormatter.format(new Date(engagement.endDate))}</span></div></div>
          <div className="resource-assignment-hours"><Clock3 /><strong>{hours}h</strong><span>/ semana</span></div>
        </article>
      ))}</div> : <div className="resource-quick-empty"><BriefcaseBusiness /><strong>Sem entregas vinculadas</strong><span>Este recurso ainda não participa de nenhum projeto ou serviço gerenciado.</span></div>}
    </Modal>
  );
}
function ResourceForm({ resource, onClose, onSave }: { resource: Resource | null; onClose: () => void; onSave: (input: ResourceInput) => Promise<void> }) {
  const [name, setName] = useState(resource?.name ?? "");
  const [email, setEmail] = useState(resource?.email ?? "");
  const [role, setRole] = useState(resource?.role ?? "");
  const [location, setLocation] = useState(resource?.location ?? "Remoto");
  const [status, setStatus] = useState<ResourceStatus>(resource?.status ?? "Ativo");
  const [weeklyCapacity, setWeeklyCapacity] = useState(resource?.weeklyCapacity ?? 40);
  const [skills, setSkills] = useState<Skill[]>(resource?.skills ?? []);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<Skill["level"]>(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addSkill() {
    const value = skillName.trim();
    if (!value || skills.some((skill) => skill.name.toLowerCase() === value.toLowerCase())) return;
    setSkills([...skills, { name: value, level: skillLevel }]);
    setSkillName("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try { await onSave({ name: name.trim(), email: email.trim(), role: role.trim(), location: location.trim(), status, weeklyCapacity, skills }); }
    catch (saveError) {
      setError(saveError instanceof Error && saveError.message.startsWith("Já existe") ? saveError.message : "Não foi possível salvar. Verifique os dados e tente novamente.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Modal title={resource ? "Editar recurso" : "Novo recurso"} description="Mantenha o perfil técnico e a disponibilidade atualizados." onClose={onClose} wide footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar recurso"}</button></>}>
        <div className="field-row"><label className="field"><span>Nome completo</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label><label className="field"><span>E-mail corporativo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label></div>
        <div className="field-row"><label className="field"><span>Função</span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Ex.: Cloud Engineer" required /></label><label className="field"><span>Localidade</span><input value={location} onChange={(event) => setLocation(event.target.value)} required /></label></div>
        <div className="field-row"><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as ResourceStatus)}><option>Ativo</option><option>Férias</option><option>Inativo</option></select></label><label className="field"><span>Capacity / semana</span><input type="number" min="0" max="168" value={weeklyCapacity} onChange={(event) => setWeeklyCapacity(Number(event.target.value))} required /><span className="field-hint">As horas alocadas são calculadas automaticamente pelas entregas ativas.</span></label></div>
        <div className="field"><span>Skills</span><div className="skill-editor"><input value={skillName} onChange={(event) => setSkillName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Ex.: Azure, React, FinOps" /><select value={skillLevel} onChange={(event) => setSkillLevel(Number(event.target.value) as Skill["level"])} aria-label="Nível da skill"><option value="1">Nível 1</option><option value="2">Nível 2</option><option value="3">Nível 3</option><option value="4">Nível 4</option><option value="5">Nível 5</option></select><button type="button" className="icon-btn" aria-label="Adicionar skill" onClick={addSkill}><Plus /></button></div><span className="field-hint">Pressione Enter ou use + para adicionar. Nível 5 representa domínio especialista.</span></div>
        {skills.length > 0 && <div className="skill-editor-list">{skills.map((skill) => <span className="skill-editor-tag" key={skill.name}>{skill.name} · L{skill.level}<button type="button" aria-label={`Remover ${skill.name}`} onClick={() => setSkills(skills.filter((item) => item.name !== skill.name))}><X /></button></span>)}</div>}
        {error && <div className="login-error" role="alert">{error}</div>}
      </Modal>
    </form>
  );
}
