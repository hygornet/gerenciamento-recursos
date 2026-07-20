"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Activity, CheckCircle2, Edit3, FolderKanban, MessageSquarePlus, Pencil, Plus, Search, ShieldAlert, Trash2, UsersRound, X } from "lucide-react";
import { usePortalData } from "@/components/providers/portal-data-provider";
import { Modal } from "@/components/ui/modal";
import type {
  Allocation,
  Engagement,
  EngagementHealth,
  EngagementInput,
  EngagementStatus,
  EngagementType,
  EngagementUpdate,
  EngagementUpdateInput,
  FollowUpCategory,
  FollowUpStatus,
} from "@/lib/types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

function statusClass(status: EngagementStatus) {
  if (status === "Em andamento") return "status-active";
  if (status === "Em risco") return "status-risk";
  if (status === "Planejamento") return "status-planning";
  return "status-complete";
}

function healthClass(health: EngagementHealth | undefined) {
  if (health === "Crítico") return "health-critical";
  if (health === "Ponto de atenção") return "health-attention";
  return "health-ok";
}

function formatPeriod(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "Não informado";
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
  const start = startDate ? formatter.format(new Date(startDate)) : "A definir";
  const end = endDate ? formatter.format(new Date(endDate)) : "A definir";
  return `${start} → ${end}`;
}

function updateDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function ProjectsPage() {
  const { engagements, resources, addEngagement, updateEngagement, deleteEngagement } = usePortalData();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const [editing, setEditing] = useState<Engagement | null | undefined>(undefined);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const tracking = trackingId ? engagements.find((engagement) => engagement.id === trackingId) ?? null : null;

  const filtered = engagements.filter((engagement) => {
    const updateText = (engagement.updates ?? []).map((update) => update.note).join(" ");
    const haystack = `${engagement.name} ${engagement.client} ${engagement.requiredSkills ?? ""} ${engagement.currentStatus ?? ""} ${updateText}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (type === "Todos" || engagement.type === type);
  });

  async function remove(engagement: Engagement) {
    if (!window.confirm(`Excluir ${engagement.name}? As alocações e o histórico vinculados também serão removidos.`)) return;
    try { await deleteEngagement(engagement.id); } catch { window.alert("Não foi possível excluir esta entrega."); }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><div className="page-eyebrow">Portfólio / Radar de contas</div><h1 className="page-title">Projetos &amp; SGs</h1><p className="page-subtitle">Execução, equipe, farol e memória operacional de cada conta.</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => setEditing(null)}><Plus />Nova entrega</button></div>
      </header>
      <div className="toolbar"><div className="toolbar-left"><label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar entrega, cliente, skill ou histórico" aria-label="Buscar projetos" /></label><select className="filter-select" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar por tipo"><option>Todos</option><option>Projeto</option><option>Serviço gerenciado</option></select></div><div className="toolbar-right"><span className="result-count">{filtered.length} entregas</span></div></div>
      {filtered.length ? (
        <section className="project-grid">
          {filtered.map((engagement) => {
            const burn = engagement.contractedHours ? Math.round(engagement.consumedHours / engagement.contractedHours * 100) : 0;
            const latestUpdate = engagement.updates?.[0];
            const health = engagement.health ?? "OK";
            return (
              <article className={`project-card ${healthClass(health)}`} key={engagement.id}>
                <div className="project-card-top">
                  <div><div className="project-type">{engagement.type}</div><h3>{engagement.name}</h3><div className="project-client">{engagement.client}</div></div>
                  <span className={`health-badge ${healthClass(health)}`}>{health}</span>
                </div>
                <div className="project-current-status"><span className={`status ${statusClass(engagement.status)}`}>{engagement.status}</span><p>{engagement.currentStatus || engagement.description || "Sem status operacional registrado."}</p></div>
                {engagement.requiredSkills && <div className="project-skills"><span>Skills exigidas</span><p>{engagement.requiredSkills}</p></div>}
                <div className="project-meta">
                  <div><span>Período</span><strong>{formatPeriod(engagement.startDate, engagement.endDate)}</strong></div>
                  <div><span>Equipe</span><strong>{engagement.allocations.length} pessoa(s)</strong></div>
                </div>
                {engagement.contractedHours > 0 && <div className="project-burn"><div className="project-burn-head"><span>Consumo de horas</span><strong>{burn}%</strong></div><div className="burn-track"><div className={burn >= 80 ? "danger" : ""} style={{ width: `${Math.min(burn, 100)}%` }} /></div></div>}
                <button className="project-latest-update" onClick={() => setTrackingId(engagement.id)}>
                  <span><Activity />{latestUpdate ? `${updateDate(latestUpdate.occurredOn)} · ${latestUpdate.category}` : "Rastro da conta"}</span>
                  <strong>{latestUpdate?.note || "Cadastre o primeiro ponto importante, gap ou próximo passo."}</strong>
                </button>
                <div className="project-footer">
                  <div className="avatar-stack">{engagement.allocations.slice(0, 4).map((allocation) => { const resource = resources.find((item) => item.id === allocation.resourceId); return resource ? <div className="avatar" title={`${resource.name}: ${allocation.hours}h`} key={resource.id}>{initials(resource.name)}</div> : null; })}{!engagement.allocations.length && <span className="field-hint">Sem alocações</span>}</div>
                  <div className="table-actions"><button className="btn btn-track" onClick={() => setTrackingId(engagement.id)}><MessageSquarePlus />Acompanhar</button><button className="table-action" aria-label={`Editar ${engagement.name}`} onClick={() => setEditing(engagement)}><Edit3 /></button><button className="table-action delete" aria-label={`Excluir ${engagement.name}`} onClick={() => void remove(engagement)}><Trash2 /></button></div>
                </div>
              </article>
            );
          })}
        </section>
      ) : <section className="data-card"><div className="empty-state"><div className="empty-state-icon"><FolderKanban /></div><h3>Nenhuma entrega encontrada</h3><p>Ajuste a busca ou cadastre um novo projeto ou SG.</p></div></section>}
      {editing !== undefined && <ProjectForm engagement={editing} onClose={() => setEditing(undefined)} onSave={async (input) => { if (editing) await updateEngagement(editing.id, input); else await addEngagement(input); setEditing(undefined); }} />}
      {tracking && <EngagementTracking engagement={tracking} onClose={() => setTrackingId(null)} />}
    </div>
  );
}

function ProjectForm({ engagement, onClose, onSave }: { engagement: Engagement | null; onClose: () => void; onSave: (input: EngagementInput) => Promise<void> }) {
  const { resources, clients } = usePortalData();
  const [name, setName] = useState(engagement?.name ?? "");
  const [clientId, setClientId] = useState(engagement?.clientId ?? clients.find((client) => client.name === engagement?.client)?.id ?? clients.find((client) => client.status === "Ativo")?.id ?? "");
  const [type, setType] = useState<EngagementType>(engagement?.type ?? "Projeto");
  const [status, setStatus] = useState<EngagementStatus>(engagement?.status ?? "Planejamento");
  const [health, setHealth] = useState<EngagementHealth>(engagement?.health ?? "OK");
  const [currentStatus, setCurrentStatus] = useState(engagement?.currentStatus ?? "");
  const [requiredSkills, setRequiredSkills] = useState(engagement?.requiredSkills ?? "");
  const [startDate, setStartDate] = useState(engagement?.startDate ?? "");
  const [endDate, setEndDate] = useState(engagement?.endDate ?? "");
  const [contractedHours, setContractedHours] = useState(engagement?.contractedHours ?? 0);
  const [consumedHours, setConsumedHours] = useState(engagement?.consumedHours ?? 0);
  const [description, setDescription] = useState(engagement?.description ?? "");
  const [allocations, setAllocations] = useState<Allocation[]>(engagement?.allocations ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addAllocation() {
    const available = resources.find((resource) => !allocations.some((allocation) => allocation.resourceId === resource.id));
    if (available) setAllocations([...allocations, { resourceId: available.id, hours: 0, role: "" }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (startDate && endDate && endDate < startDate) { setError("A data final deve ser posterior à data inicial."); return; }
    const selectedClient = clients.find((client) => client.id === clientId);
    if (!selectedClient) { setError("Selecione um cliente cadastrado para esta entrega."); return; }
    if (new Set(allocations.map((allocation) => allocation.resourceId)).size !== allocations.length) { setError("Cada recurso pode aparecer apenas uma vez nas alocações."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        clientId,
        client: selectedClient.name,
        type,
        status,
        health,
        currentStatus: currentStatus.trim(),
        requiredSkills: requiredSkills.trim(),
        consultantSnapshot: engagement?.consultantSnapshot ?? "",
        startDate,
        endDate,
        contractedHours,
        consumedHours,
        description: description.trim(),
        allocations,
      });
    } catch {
      setError("Não foi possível salvar. Verifique os dados e tente novamente.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Modal title={engagement ? "Editar entrega" : "Nova entrega"} description="Registre escopo, farol, situação da conta e pessoas responsáveis." onClose={onClose} wide footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={saving || !clients.length}>{saving ? "Salvando..." : "Salvar entrega"}</button></>}>
        <div className="field-row"><label className="field"><span>Nome da entrega</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label><label className="field"><span>Cliente</span><select value={clientId} onChange={(event) => setClientId(event.target.value)} required disabled={!clients.length}><option value="">Selecione um cliente</option>{clients.filter((client) => client.status === "Ativo" || client.id === clientId).map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label></div>
        {!clients.length && <div className="form-notice">Cadastre um cliente no menu Clientes antes de criar uma entrega.</div>}
        <div className="field-row"><label className="field"><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as EngagementType)}><option>Projeto</option><option>Serviço gerenciado</option></select></label><label className="field"><span>Farol</span><select value={health} onChange={(event) => setHealth(event.target.value as EngagementHealth)}><option>OK</option><option>Ponto de atenção</option><option>Crítico</option></select></label></div>
        <div className="field-row"><label className="field"><span>Fase</span><select value={status} onChange={(event) => setStatus(event.target.value as EngagementStatus)}><option>Planejamento</option><option>Em andamento</option><option>Em risco</option><option>Concluído</option></select></label><label className="field"><span>Situação atual</span><input value={currentStatus} onChange={(event) => setCurrentStatus(event.target.value)} placeholder="Ex.: aguardando validação do cliente" /></label></div>
        <label className="field"><span>Skills exigidas</span><textarea value={requiredSkills} onChange={(event) => setRequiredSkills(event.target.value)} placeholder="Power Apps, Copilot Studio, Dataverse..." /></label>
        <div className="field-row"><label className="field"><span>Início</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span>Fim</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
        <div className="field-row"><label className="field"><span>Horas contratadas</span><input type="number" min="0" value={contractedHours} onChange={(event) => setContractedHours(Number(event.target.value))} /></label><label className="field"><span>Horas consumidas</span><input type="number" min="0" value={consumedHours} onChange={(event) => setConsumedHours(Number(event.target.value))} /></label></div>
        <label className="field"><span>Descrição / escopo</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo e escopo principal da entrega" /></label>
        <div className="field"><span>Alocações semanais</span><div className="allocation-editor">{allocations.map((allocation, index) => <div className="allocation-row allocation-row-detailed" key={`${allocation.resourceId}-${index}`}><select value={allocation.resourceId} onChange={(event) => setAllocations(allocations.map((item, itemIndex) => itemIndex === index ? { ...item, resourceId: event.target.value } : item))} aria-label="Recurso alocado">{resources.map((resource) => <option value={resource.id} key={resource.id}>{resource.name}</option>)}</select><input value={allocation.role ?? ""} onChange={(event) => setAllocations(allocations.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item))} placeholder="Papel" aria-label="Papel na entrega" /><input type="number" min="0" max="168" step="0.5" value={allocation.hours} onChange={(event) => setAllocations(allocations.map((item, itemIndex) => itemIndex === index ? { ...item, hours: Number(event.target.value), percentage: undefined } : item))} aria-label="Horas semanais" /><button type="button" className="table-action delete" aria-label="Remover alocação" onClick={() => setAllocations(allocations.filter((_, itemIndex) => itemIndex !== index))}><X /></button></div>)}<button type="button" className="btn btn-secondary" disabled={allocations.length >= resources.length} onClick={addAllocation}><Plus />Adicionar pessoa</button></div></div>
        {error && <div className="login-error" role="alert">{error}</div>}
      </Modal>
    </form>
  );
}

function EngagementTracking({ engagement, onClose }: { engagement: Engagement; onClose: () => void }) {
  const { resources, addEngagementUpdate, updateEngagementUpdate, deleteEngagementUpdate } = usePortalData();
  const updates = useMemo(() => [...(engagement.updates ?? [])].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)), [engagement.updates]);
  const [editing, setEditing] = useState<EngagementUpdate | null>(null);
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<FollowUpCategory>("Atualização");
  const [status, setStatus] = useState<FollowUpStatus>("Aberto");
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(update: EngagementUpdate) {
    setEditing(update);
    setOccurredOn(update.occurredOn);
    setCategory(update.category);
    setStatus(update.status);
    setNote(update.note);
    setAuthor(update.author);
  }

  function resetForm() {
    setEditing(null);
    setOccurredOn(new Date().toISOString().slice(0, 10));
    setCategory("Atualização");
    setStatus("Aberto");
    setNote("");
    setAuthor("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (note.trim().length < 2) { setError("Descreva a atualização, ponto importante ou gap com pelo menos 2 caracteres."); return; }
    const input: EngagementUpdateInput = { occurredOn, category, status, note: note.trim(), author: author.trim() };
    setSaving(true);
    setError("");
    try {
      if (editing) await updateEngagementUpdate(editing.id, input);
      else await addEngagementUpdate(engagement.id, input);
      resetForm();
    } catch {
      setError("Não foi possível salvar o acompanhamento.");
    } finally {
      setSaving(false);
    }
  }

  async function markResolved(update: EngagementUpdate) {
    try { await updateEngagementUpdate(update.id, { occurredOn: update.occurredOn, category: update.category, status: "Resolvido", note: update.note, author: update.author }); }
    catch { window.alert("Não foi possível marcar o registro como resolvido."); }
  }

  async function remove(update: EngagementUpdate) {
    if (!window.confirm("Excluir este registro do acompanhamento?")) return;
    try { await deleteEngagementUpdate(update.id); } catch { window.alert("Não foi possível excluir o registro."); }
  }

  return (
    <Modal title={engagement.name} description={`${engagement.client} · rastro da conta`} onClose={onClose} wide footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>}>
      <section className="tracking-overview">
        <div><span>Farol atual</span><strong className={`health-badge ${healthClass(engagement.health)}`}>{engagement.health ?? "OK"}</strong></div>
        <div><span>Situação</span><strong>{engagement.currentStatus || engagement.status}</strong></div>
        <div><span>Registros</span><strong>{updates.length}</strong></div>
      </section>

      <section className="tracking-context-grid">
        <div><span>Situação registrada</span><p>{engagement.currentStatus || "Sem situação operacional detalhada."}</p></div>
        <div><span>Skills exigidas</span><p>{engagement.requiredSkills || "Não informadas."}</p></div>
        <div><span>Equipe informada na origem</span><p>{engagement.consultantSnapshot || "Não informada."}</p></div>
      </section>

      <section className="tracking-team">
        <div className="tracking-section-title"><UsersRound /><div><span>Distribuição registrada</span><strong>Equipe alocada</strong></div></div>
        {engagement.allocations.length ? <div className="tracking-team-list">{engagement.allocations.map((allocation) => {
          const resource = resources.find((item) => item.id === allocation.resourceId);
          return <div className="tracking-team-row" key={allocation.resourceId}><div><strong>{resource?.name || "Recurso não encontrado"}</strong><span>{allocation.role || "Papel não informado"}</span></div><div><strong>{Math.round((allocation.percentage ?? (resource?.weeklyCapacity ? allocation.hours / resource.weeklyCapacity : 0)) * 100)}%</strong><span>{allocation.hours}h/semana</span></div><div><strong>{allocation.offerType || engagement.type}</strong><span>{allocation.sourceStatus || engagement.currentStatus || engagement.status}</span></div></div>;
        })}</div> : <p className="field-hint">Nenhuma alocação registrada.</p>}
      </section>
      <form className="tracking-form" onSubmit={submit}>
        <div className="tracking-form-title"><MessageSquarePlus /><div><strong>{editing ? "Editar registro" : "Novo acompanhamento"}</strong><span>Registre contexto suficiente para retomar a conta depois.</span></div>{editing && <button type="button" className="table-action" aria-label="Cancelar edição" onClick={resetForm}><X /></button>}</div>
        <div className="field-row field-row-3"><label className="field"><span>Data</span><input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} required /></label><label className="field"><span>Tipo</span><select value={category} onChange={(event) => setCategory(event.target.value as FollowUpCategory)}><option>Atualização</option><option>Ponto de atenção</option><option>Gap</option><option>Risco</option><option>Decisão</option><option>Próximo passo</option></select></label><label className="field"><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as FollowUpStatus)}><option>Aberto</option><option>Em acompanhamento</option><option>Resolvido</option></select></label></div>
        <label className="field"><span>Registro</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que aconteceu, qual o impacto e qual é o próximo passo?" minLength={2} required /></label>
        <div className="tracking-form-footer"><label className="field"><span>Autor</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Nome de quem fez o registro" /></label><button className="btn btn-primary" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar ao histórico"}</button></div>
        {error && <div className="login-error" role="alert">{error}</div>}
      </form>

      <section className="account-trail" aria-label="Histórico da conta">
        <div className="account-trail-heading"><div><Activity /><span>Rastro cronológico</span></div><strong>{updates.filter((update) => update.status !== "Resolvido").length} item(ns) aberto(s)</strong></div>
        {updates.length ? updates.map((update) => (
          <article className={`trail-entry trail-${update.category.toLowerCase().replaceAll(" ", "-").replaceAll("ç", "c").replaceAll("ã", "a")}`} key={update.id}>
            <div className="trail-node" />
            <div className="trail-card">
              <div className="trail-card-head"><div><span>{updateDate(update.occurredOn)}</span><strong>{update.category}</strong></div><span className={`tracking-status tracking-status-${update.status === "Resolvido" ? "resolved" : update.status === "Em acompanhamento" ? "watching" : "open"}`}>{update.status}</span></div>
              <p>{update.note}</p>
              <div className="trail-card-footer"><span>{update.author || "Autor não informado"}</span><div className="table-actions">{update.status !== "Resolvido" && <button className="table-action resolve" title="Marcar como resolvido" aria-label="Marcar como resolvido" onClick={() => void markResolved(update)}><CheckCircle2 /></button>}<button className="table-action" title="Editar" aria-label="Editar registro" onClick={() => startEdit(update)}><Pencil /></button><button className="table-action delete" title="Excluir" aria-label="Excluir registro" onClick={() => void remove(update)}><Trash2 /></button></div></div>
            </div>
          </article>
        )) : <div className="tracking-empty"><ShieldAlert /><strong>Nenhum registro ainda</strong><span>Use o formulário acima para deixar o primeiro contexto desta conta.</span></div>}
      </section>
    </Modal>
  );
}