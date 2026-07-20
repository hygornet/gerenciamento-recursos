"use client";

import { useState, type FormEvent } from "react";
import { Award, Edit3, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { usePortalData } from "@/components/providers/portal-data-provider";
import { Modal } from "@/components/ui/modal";
import type { Certification, CertificationInput, CertificationLevel } from "@/lib/types";

export function CertificationsPage() {
  const { certifications, resources, addCertification, updateCertification, deleteCertification } = usePortalData();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("Todos");
  const [editing, setEditing] = useState<Certification | null | undefined>(undefined);
  const filtered = certifications.filter((certification) => `${certification.code} ${certification.name}`.toLowerCase().includes(search.toLowerCase()) && (level === "Todos" || certification.level === level));
  const totalHolders = certifications.reduce((sum, certification) => sum + certification.holders, 0);
  const uncovered = certifications.filter((certification) => certification.holders === 0).length;

  async function remove(certification: Certification) {
    if (!window.confirm(`Excluir ${certification.code} · ${certification.name}?`)) return;
    try { await deleteCertification(certification.id); } catch { window.alert("Não foi possível excluir a certificação."); }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><div className="page-eyebrow">Desenvolvimento / Microsoft</div><h1 className="page-title">Certificações</h1><p className="page-subtitle">Catálogo e cobertura de credenciais Microsoft no time.</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => setEditing(null)}><Plus />Nova certificação</button></div>
      </header>
      <section className="cert-summary">
        <article className="summary-card"><span>Certificações no catálogo</span><strong>{String(certifications.length).padStart(2, "0")}</strong></article>
        <article className="summary-card"><span>Credenciais no time</span><strong>{String(totalHolders).padStart(2, "0")} <small>em {resources.length} recursos</small></strong></article>
        <article className="summary-card"><span>Gaps de cobertura</span><strong style={{ color: uncovered ? "var(--coral)" : "var(--teal)" }}>{String(uncovered).padStart(2, "0")}</strong></article>
      </section>
      <div className="toolbar"><div className="toolbar-left"><label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou certificação" aria-label="Buscar certificações" /></label><select className="filter-select" value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filtrar por nível"><option>Todos</option><option>Fundamental</option><option>Associate</option><option>Expert</option><option>Specialty</option></select></div><div className="toolbar-right"><span className="result-count">{filtered.length} certificações</span></div></div>
      <section className="data-card">
        {filtered.length ? <table className="data-table"><thead><tr><th>Código</th><th>Certificação Microsoft</th><th>Nível</th><th>Renovação</th><th>Cobertura</th><th aria-label="Ações" /></tr></thead><tbody>{filtered.map((certification) => <tr key={certification.id}><td><span className="cert-code">{certification.code}</span></td><td><div className="table-person"><div className="avatar"><Award /></div><div><strong>{certification.name}</strong><span>Microsoft Learn credential</span></div></div></td><td><span className="level-pill">{certification.level}</span></td><td><span className="mono">{certification.renewalMonths} meses</span></td><td><span className={`status ${certification.holders ? "status-active" : "status-risk"}`}>{certification.holders} {certification.holders === 1 ? "recurso" : "recursos"}</span></td><td><div className="table-actions"><button className="table-action" aria-label={`Editar ${certification.code}`} onClick={() => setEditing(certification)}><Edit3 /></button><button className="table-action delete" aria-label={`Excluir ${certification.code}`} onClick={() => void remove(certification)}><Trash2 /></button></div></td></tr>)}</tbody></table> : <div className="empty-state"><div className="empty-state-icon"><ShieldCheck /></div><h3>Nenhuma certificação encontrada</h3><p>Ajuste os filtros ou adicione uma credencial ao catálogo.</p></div>}
      </section>
      {editing !== undefined && <CertificationForm certification={editing} onClose={() => setEditing(undefined)} onSave={async (input) => { if (editing) await updateCertification(editing.id, input); else await addCertification(input); setEditing(undefined); }} />}
    </div>
  );
}

function CertificationForm({ certification, onClose, onSave }: { certification: Certification | null; onClose: () => void; onSave: (input: CertificationInput) => Promise<void> }) {
  const [code, setCode] = useState(certification?.code ?? "");
  const [name, setName] = useState(certification?.name ?? "");
  const [level, setLevel] = useState<CertificationLevel>(certification?.level ?? "Associate");
  const [renewalMonths, setRenewalMonths] = useState(certification?.renewalMonths ?? 12);
  const [holders, setHolders] = useState(certification?.holders ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try { await onSave({ code: code.trim().toUpperCase(), name, level, renewalMonths, holders }); }
    catch { setError("Não foi possível salvar. Verifique se o código já existe."); setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      <Modal title={certification ? "Editar certificação" : "Nova certificação"} description="Adicione uma credencial oficial ao catálogo do time." onClose={onClose} footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar certificação"}</button></>}>
        <div className="field-row"><label className="field"><span>Código do exame</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex.: AZ-104" required autoFocus /></label><label className="field"><span>Nível</span><select value={level} onChange={(event) => setLevel(event.target.value as CertificationLevel)}><option>Fundamental</option><option>Associate</option><option>Expert</option><option>Specialty</option></select></label></div>
        <label className="field"><span>Nome oficial</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Azure Administrator Associate" required /></label>
        <div className="field-row"><label className="field"><span>Ciclo de renovação</span><input type="number" min="0" max="120" value={renewalMonths} onChange={(event) => setRenewalMonths(Number(event.target.value))} required /><span className="field-hint">Em meses. Use 0 se não expirar.</span></label><label className="field"><span>Recursos certificados</span><input type="number" min="0" value={holders} onChange={(event) => setHolders(Number(event.target.value))} required /><span className="field-hint">Contagem atual no time.</span></label></div>
        {error && <div className="login-error" role="alert">{error}</div>}
      </Modal>
    </form>
  );
}
