"use client";

import { useState, type FormEvent } from "react";
import { Edit3, FolderKanban, Plus, Search, Trash2, X } from "lucide-react";
import { usePortalData } from "@/components/providers/portal-data-provider";
import { Modal } from "@/components/ui/modal";
import type { Allocation, Engagement, EngagementInput, EngagementStatus, EngagementType } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

function statusClass(status: EngagementStatus) {
  if (status === "Em andamento") return "status-active";
  if (status === "Em risco") return "status-risk";
  if (status === "Planejamento") return "status-planning";
  return "status-complete";
}

export function ProjectsPage() {
  const { engagements, resources, addEngagement, updateEngagement, deleteEngagement } = usePortalData();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const [editing, setEditing] = useState<Engagement | null | undefined>(undefined);
  const filtered = engagements.filter((engagement) => `${engagement.name} ${engagement.client}`.toLowerCase().includes(search.toLowerCase()) && (type === "Todos" || engagement.type === type));

  async function remove(engagement: Engagement) {
    if (!window.confirm(`Excluir ${engagement.name}? As alocações vinculadas também serão removidas.`)) return;
    try { await deleteEngagement(engagement.id); } catch { window.alert("Não foi possível excluir esta entrega."); }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><div className="page-eyebrow">Portfólio / Entregas</div><h1 className="page-title">Projetos &amp; SGs</h1><p className="page-subtitle">Acompanhe execução, equipe e saldo de horas de consultoria.</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => setEditing(null)}><Plus />Nova entrega</button></div>
      </header>
      <div className="toolbar"><div className="toolbar-left"><label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar projeto ou cliente" aria-label="Buscar projetos" /></label><select className="filter-select" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar por tipo"><option>Todos</option><option>Projeto</option><option>Serviço gerenciado</option></select></div><div className="toolbar-right"><span className="result-count">{filtered.length} entregas</span></div></div>
      {filtered.length ? (
        <section className="project-grid">
          {filtered.map((engagement) => {
            const burn = engagement.contractedHours ? Math.round(engagement.consumedHours / engagement.contractedHours * 100) : 0;
            return (
              <article className={`project-card ${engagement.status === "Em risco" ? "risk" : ""}`} key={engagement.id}>
                <div className="project-card-top"><div><div className="project-type">{engagement.type}</div><h3>{engagement.name}</h3><div className="project-client">{engagement.client}</div></div><span className={`status ${statusClass(engagement.status)}`}>{engagement.status}</span></div>
                <p className="project-description">{engagement.description || "Sem descrição registrada."}</p>
                <div className="project-meta"><div><span>Período</span><strong>{new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(engagement.startDate))} → {new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(engagement.endDate))}</strong></div><div><span>Saldo</span><strong>{engagement.contractedHours - engagement.consumedHours}h</strong></div></div>
                <div className="project-burn"><div className="project-burn-head"><span>Consumo de horas</span><strong>{burn}%</strong></div><div className="burn-track"><div className={burn >= 80 ? "danger" : ""} style={{ width: `${Math.min(burn, 100)}%` }} /></div></div>
                <div className="project-footer"><div className="avatar-stack">{engagement.allocations.slice(0, 4).map((allocation) => { const resource = resources.find((item) => item.id === allocation.resourceId); return resource ? <div className="avatar" title={`${resource.name}: ${allocation.hours}h`} key={resource.id}>{initials(resource.name)}</div> : null; })}{!engagement.allocations.length && <span className="field-hint">Sem alocações</span>}</div><div className="table-actions"><button className="table-action" aria-label={`Editar ${engagement.name}`} onClick={() => setEditing(engagement)}><Edit3 /></button><button className="table-action delete" aria-label={`Excluir ${engagement.name}`} onClick={() => void remove(engagement)}><Trash2 /></button></div></div>
              </article>
            );
          })}
        </section>
      ) : <section className="data-card"><div className="empty-state"><div className="empty-state-icon"><FolderKanban /></div><h3>Nenhuma entrega encontrada</h3><p>Ajuste a busca ou cadastre um novo projeto ou SG.</p></div></section>}
      {editing !== undefined && <ProjectForm engagement={editing} onClose={() => setEditing(undefined)} onSave={async (input) => { if (editing) await updateEngagement(editing.id, input); else await addEngagement(input); setEditing(undefined); }} />}
    </div>
  );
}

function ProjectForm({ engagement, onClose, onSave }: { engagement: Engagement | null; onClose: () => void; onSave: (input: EngagementInput) => Promise<void> }) {
  const { resources, clients } = usePortalData();
  const [name, setName] = useState(engagement?.name ?? "");
  const [clientId, setClientId] = useState(engagement?.clientId ?? clients.find((client) => client.name === engagement?.client)?.id ?? clients.find((client) => client.status === "Ativo")?.id ?? "");
  const [type, setType] = useState<EngagementType>(engagement?.type ?? "Projeto");
  const [status, setStatus] = useState<EngagementStatus>(engagement?.status ?? "Planejamento");
  const [startDate, setStartDate] = useState(engagement?.startDate ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(engagement?.endDate ?? "");
  const [contractedHours, setContractedHours] = useState(engagement?.contractedHours ?? 0);
  const [consumedHours, setConsumedHours] = useState(engagement?.consumedHours ?? 0);
  const [description, setDescription] = useState(engagement?.description ?? "");
  const [allocations, setAllocations] = useState<Allocation[]>(engagement?.allocations ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addAllocation() {
    const available = resources.find((resource) => !allocations.some((allocation) => allocation.resourceId === resource.id));
    if (available) setAllocations([...allocations, { resourceId: available.id, hours: 8 }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (endDate && endDate < startDate) { setError("A data final deve ser posterior à data inicial."); return; }
    const selectedClient = clients.find((client) => client.id === clientId);
    if (!selectedClient) { setError("Selecione um cliente cadastrado para esta entrega."); return; }
    if (new Set(allocations.map((allocation) => allocation.resourceId)).size !== allocations.length) { setError("Cada recurso pode aparecer apenas uma vez nas alocações."); return; }
    setSaving(true);
    setError("");
    try { await onSave({ name, clientId, client: selectedClient.name, type, status, startDate, endDate, contractedHours, consumedHours, description, allocations }); }
    catch { setError("Não foi possível salvar. Verifique os dados e tente novamente."); setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      <Modal title={engagement ? "Editar entrega" : "Nova entrega"} description="Registre escopo, horas e pessoas responsáveis pela execução." onClose={onClose} wide footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={saving || !clients.length}>{saving ? "Salvando..." : "Salvar entrega"}</button></>}>
        <div className="field-row"><label className="field"><span>Nome da entrega</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label><label className="field"><span>Cliente</span><select value={clientId} onChange={(event) => setClientId(event.target.value)} required disabled={!clients.length}><option value="">Selecione um cliente</option>{clients.filter((client) => client.status === "Ativo" || client.id === clientId).map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label></div>
        {!clients.length && <div className="form-notice">Cadastre um cliente no menu Clientes antes de criar uma entrega.</div>}
        <div className="field-row"><label className="field"><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as EngagementType)}><option>Projeto</option><option>Serviço gerenciado</option></select></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as EngagementStatus)}><option>Planejamento</option><option>Em andamento</option><option>Em risco</option><option>Concluído</option></select></label></div>
        <div className="field-row"><label className="field"><span>Início</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label className="field"><span>Fim</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label></div>
        <div className="field-row"><label className="field"><span>Horas contratadas</span><input type="number" min="0" value={contractedHours} onChange={(event) => setContractedHours(Number(event.target.value))} required /></label><label className="field"><span>Horas consumidas</span><input type="number" min="0" value={consumedHours} onChange={(event) => setConsumedHours(Number(event.target.value))} required /></label></div>
        <label className="field"><span>Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo e escopo principal da entrega" /></label>
        <div className="field"><span>Alocações semanais</span><div className="allocation-editor">{allocations.map((allocation, index) => <div className="allocation-row" key={`${allocation.resourceId}-${index}`}><select value={allocation.resourceId} onChange={(event) => setAllocations(allocations.map((item, itemIndex) => itemIndex === index ? { ...item, resourceId: event.target.value } : item))} aria-label="Recurso alocado">{resources.map((resource) => <option value={resource.id} key={resource.id}>{resource.name}</option>)}</select><input type="number" min="1" max="168" value={allocation.hours} onChange={(event) => setAllocations(allocations.map((item, itemIndex) => itemIndex === index ? { ...item, hours: Number(event.target.value) } : item))} aria-label="Horas semanais" /><button type="button" className="table-action delete" aria-label="Remover alocação" onClick={() => setAllocations(allocations.filter((_, itemIndex) => itemIndex !== index))}><X /></button></div>)}<button type="button" className="btn btn-secondary" disabled={allocations.length >= resources.length} onClick={addAllocation}><Plus />Adicionar pessoa</button></div></div>
        {error && <div className="login-error" role="alert">{error}</div>}
      </Modal>
    </form>
  );
}
