"use client";

import { useState, type FormEvent } from "react";
import { Building2, Edit3, Mail, Phone, Plus, Search, Trash2 } from "lucide-react";
import { usePortalData } from "@/components/providers/portal-data-provider";
import { Modal } from "@/components/ui/modal";
import type { Client, ClientInput, ClientStatus } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function statusClass(status: ClientStatus) {
  return status === "Ativo" ? "status-active" : "status-inactive";
}

export function ClientsPage() {
  const { clients, engagements, addClient, updateClient, deleteClient } = usePortalData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const filtered = clients.filter((client) => {
    const text = `${client.name} ${client.document} ${client.contactName} ${client.email}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (status === "Todos" || client.status === status);
  });

  async function remove(client: Client) {
    const deliveries = engagements.filter((engagement) => engagement.clientId === client.id).length;
    if (deliveries) {
      window.alert(`${client.name} possui ${deliveries} entrega(s) vinculada(s). Remova ou transfira essas entregas antes de excluir o cliente.`);
      return;
    }
    if (!window.confirm(`Excluir o cliente ${client.name}?`)) return;
    try { await deleteClient(client.id); } catch { window.alert("Não foi possível excluir este cliente."); }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><div className="page-eyebrow">Relacionamento / Carteira</div><h1 className="page-title">Clientes</h1><p className="page-subtitle">Centralize os clientes e conecte cada entrega à empresa correta.</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => setEditing(null)}><Plus />Novo cliente</button></div>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, contato ou documento" aria-label="Buscar clientes" /></label>
          <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar clientes por status"><option>Todos</option><option>Ativo</option><option>Inativo</option></select>
        </div>
        <div className="toolbar-right"><span className="result-count">{filtered.length} de {clients.length} clientes</span></div>
      </div>

      <section className="data-card">
        {filtered.length ? (
          <table className="data-table clients-table">
            <thead><tr><th>Cliente</th><th>Status</th><th>Contato principal</th><th>Documento</th><th>Entregas</th><th aria-label="Ações" /></tr></thead>
            <tbody>{filtered.map((client) => {
              const deliveries = engagements.filter((engagement) => engagement.clientId === client.id).length;
              return (
                <tr key={client.id}>
                  <td><div className="table-person"><div className="avatar client-avatar">{initials(client.name)}</div><div><strong>{client.name}</strong><span>{client.email || "E-mail não informado"}</span></div></div></td>
                  <td><span className={`status ${statusClass(client.status)}`}>{client.status}</span></td>
                  <td><div className="client-contact"><strong>{client.contactName || "Não informado"}</strong>{client.email && <span><Mail />{client.email}</span>}{client.phone && <span><Phone />{client.phone}</span>}</div></td>
                  <td><span className="document-value">{client.document || "—"}</span></td>
                  <td><span className="project-count"><Building2 />{deliveries}</span></td>
                  <td><div className="table-actions"><button className="table-action" aria-label={`Editar ${client.name}`} onClick={() => setEditing(client)}><Edit3 /></button><button className="table-action delete" aria-label={`Excluir ${client.name}`} onClick={() => void remove(client)}><Trash2 /></button></div></td>
                </tr>
              );
            })}</tbody>
          </table>
        ) : <div className="empty-state"><div className="empty-state-icon"><Building2 /></div><h3>Nenhum cliente encontrado</h3><p>Ajuste os filtros ou cadastre uma nova empresa.</p></div>}
      </section>

      {editing !== undefined && <ClientForm client={editing} onClose={() => setEditing(undefined)} onSave={async (input) => { if (editing) await updateClient(editing.id, input); else await addClient(input); setEditing(undefined); }} />}
    </div>
  );
}

function ClientForm({ client, onClose, onSave }: { client: Client | null; onClose: () => void; onSave: (input: ClientInput) => Promise<void> }) {
  const [name, setName] = useState(client?.name ?? "");
  const [document, setDocument] = useState(client?.document ?? "");
  const [contactName, setContactName] = useState(client?.contactName ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? "Ativo");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try { await onSave({ name: name.trim(), document: document.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim(), status, notes: notes.trim() }); }
    catch { setError("Não foi possível salvar. Já pode existir um cliente com esse nome."); setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      <Modal title={client ? "Editar cliente" : "Novo cliente"} description="Registre os dados essenciais para relacionar projetos e serviços gerenciados." onClose={onClose} wide footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar cliente"}</button></>}>
        <div className="field-row"><label className="field"><span>Razão social / Nome</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label><label className="field"><span>CNPJ / Documento</span><input value={document} onChange={(event) => setDocument(event.target.value)} placeholder="Opcional" /></label></div>
        <div className="field-row"><label className="field"><span>Contato principal</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Nome do responsável" /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as ClientStatus)}><option>Ativo</option><option>Inativo</option></select></label></div>
        <div className="field-row"><label className="field"><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contato@cliente.com" /></label><label className="field"><span>Telefone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(00) 00000-0000" /></label></div>
        <label className="field"><span>Observações</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contexto comercial ou operacional relevante" /></label>
        {error && <div className="login-error" role="alert">{error}</div>}
      </Modal>
    </form>
  );
}
