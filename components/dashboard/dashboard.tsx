"use client";

import Link from "next/link";
import { ArrowRight, Award, BriefcaseBusiness, CalendarClock, Gauge, TrendingUp, Users, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePortalData } from "@/components/providers/portal-data-provider";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

function chartLabel(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export function Dashboard() {
  const { resources, engagements, certifications } = usePortalData();
  const activeResources = resources.filter((resource) => resource.status !== "Inativo");
  const totalCapacity = activeResources.reduce((sum, resource) => sum + resource.weeklyCapacity, 0);
  const totalAllocated = activeResources.reduce((sum, resource) => sum + resource.allocatedHours, 0);
  const utilization = totalCapacity ? Math.round((totalAllocated / totalCapacity) * 100) : 0;
  const activeEngagements = engagements.filter((engagement) => ["Em andamento", "Em risco"].includes(engagement.status));
  const managedServices = engagements.filter((engagement) => engagement.type === "Serviço gerenciado" && engagement.status !== "Concluído");
  const contracted = managedServices.reduce((sum, engagement) => sum + engagement.contractedHours, 0);
  const consumed = managedServices.reduce((sum, engagement) => sum + engagement.consumedHours, 0);
  const overloaded = activeResources.filter((resource) => resource.allocatedHours > resource.weeklyCapacity);
  const highBurn = activeEngagements.filter((engagement) => engagement.contractedHours && engagement.consumedHours / engagement.contractedHours >= .8);
  const uncoveredCertification = certifications.find((certification) => certification.holders === 0);
  const labelCounts = new Map<string, number>();
  const capacityData = activeResources.map((resource) => {
    const baseLabel = chartLabel(resource.name);
    const count = (labelCounts.get(baseLabel) ?? 0) + 1;
    labelCounts.set(baseLabel, count);
    return { name: count > 1 ? `${baseLabel} (${count})` : baseLabel, capacity: resource.weeklyCapacity, allocation: resource.allocatedHours };
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Radar / Julho 2026</div>
          <h1 className="page-title">O time, em perspectiva.</h1>
          <p className="page-subtitle">Sinais que pedem sua atenção nesta semana.</p>
        </div>
        <div className="page-actions"><Link href="/projetos" className="btn btn-secondary"><BriefcaseBusiness />Revisar entregas</Link></div>
      </header>

      <section className="overview-strip" aria-label="Indicadores principais">
        <article className="overview-primary">
          <div className="metric-label"><Gauge />Utilização do time</div>
          <div className="metric-value">{utilization}%</div>
          <div className="metric-context">{totalAllocated}h alocadas de {totalCapacity}h semanais</div>
        </article>
        <article className="overview-metric">
          <div className="metric-label"><Users />Recursos ativos</div>
          <div className="metric-value">{String(activeResources.length).padStart(2, "0")}</div>
          <div className="metric-context"><span className="metric-delta"><TrendingUp /> estável</span> este mês</div>
        </article>
        <article className="overview-metric">
          <div className="metric-label"><BriefcaseBusiness />Entregas ativas</div>
          <div className="metric-value">{String(activeEngagements.length).padStart(2, "0")}</div>
          <div className="metric-context"><span className="metric-delta danger">{highBurn.length} em atenção</span></div>
        </article>
        <article className="overview-metric">
          <div className="metric-label"><Zap />Saldo de consultoria</div>
          <div className="metric-value">{contracted - consumed}h</div>
          <div className="metric-context">de {contracted}h contratadas em SGs</div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div><h2>Distribuição de capacity</h2><p>Horas semanais disponíveis e alocadas por recurso</p></div>
            <div className="chart-legend"><span className="legend-item"><i className="legend-dot" style={{ background: "#8fcfc2" }} />Disponível</span><span className="legend-item"><i className="legend-dot" style={{ background: "#087f72" }} />Alocada</span></div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityData} margin={{ top: 12, right: 10, left: -23, bottom: 0 }} barGap={3}>
                <CartesianGrid stroke="#e9efed" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#7c8d93", fontSize: 10 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7c8d93", fontSize: 10 }} domain={[0, "auto"]} />
                <Tooltip cursor={{ fill: "#f2f5f3" }} content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item, index) => <div key={`${String(item.name)}-${index}`}>{item.name}: <span className="mono">{item.value}h</span></div>)}</div> : null} />
                <Bar dataKey="capacity" name="Disponível" fill="#8fcfc2" radius={[5, 5, 0, 0]} />
                <Bar dataKey="allocation" name="Alocada" fill="#087f72" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <div className="card-header"><div><h2>Pede atenção</h2><p>Prioridades calculadas pelo radar</p></div><span className="status status-risk">{overloaded.length + highBurn.length}</span></div>
          <div className="alert-list">
            {overloaded.slice(0, 1).map((resource) => <div className="alert-item" key={resource.id}><div className="alert-icon"><Gauge /></div><div className="alert-copy"><strong>{resource.name} sobrealocada</strong><span>{resource.allocatedHours}h em uma semana de {resource.weeklyCapacity}h</span></div><Link className="alert-action" href="/recursos" aria-label="Ver recurso"><ArrowRight /></Link></div>)}
            {highBurn.slice(0, 1).map((engagement) => <div className="alert-item" key={engagement.id}><div className="alert-icon warning"><CalendarClock /></div><div className="alert-copy"><strong>{engagement.name} em {Math.round(engagement.consumedHours / engagement.contractedHours * 100)}%</strong><span>{engagement.consumedHours}h consumidas de {engagement.contractedHours}h</span></div><Link className="alert-action" href="/projetos" aria-label="Ver projeto"><ArrowRight /></Link></div>)}
            {uncoveredCertification && <div className="alert-item"><div className="alert-icon info"><Award /></div><div className="alert-copy"><strong>Gap em {uncoveredCertification.code}</strong><span>Nenhum recurso possui esta certificação no catálogo atual</span></div><Link className="alert-action" href="/certificacoes" aria-label="Ver certificações"><ArrowRight /></Link></div>}
          </div>
        </article>
      </section>

      <section className="dashboard-lower">
        <article className="card">
          <div className="card-header"><div><h2>Pulse do time</h2><p>Alocação semanal por recurso</p></div><Link href="/recursos" className="text-link">Todos os recursos <ArrowRight /></Link></div>
          <div className="capacity-list">
            {activeResources.slice(0, 5).map((resource) => {
              const percentage = resource.weeklyCapacity ? Math.round(resource.allocatedHours / resource.weeklyCapacity * 100) : 0;
              const tone = percentage > 100 ? "danger" : percentage >= 90 ? "warning" : "";
              return <div className="capacity-row" key={resource.id}><div className="resource-mini"><div className="avatar small">{initials(resource.name)}</div><div><strong>{resource.name}</strong><span>{resource.role}</span></div></div><div className="capacity-track"><div className={`capacity-fill ${tone}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div><div className={`capacity-value ${tone}`}>{percentage}%</div></div>;
            })}
          </div>
        </article>

        <article className="card">
          <div className="card-header"><div><h2>Consumo de serviços</h2><p>Horas de consultoria em contratos ativos</p></div><Link href="/projetos" className="text-link">Abrir SGs <ArrowRight /></Link></div>
          <div className="engagement-list">
            {managedServices.map((engagement) => {
              const percentage = engagement.contractedHours ? Math.round(engagement.consumedHours / engagement.contractedHours * 100) : 0;
              return <div className="engagement-mini" key={engagement.id}><div className="engagement-mini-head"><div><strong>{engagement.name}</strong><br /><span>{engagement.client}</span></div><span className="mono">{engagement.consumedHours} / {engagement.contractedHours}h</span></div><div className="burn-track"><div className={percentage >= 80 ? "danger" : ""} style={{ width: `${Math.min(percentage, 100)}%` }} /></div></div>;
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
