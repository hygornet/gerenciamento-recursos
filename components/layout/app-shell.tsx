"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Award, Bell, BriefcaseBusiness, Building2, Info, LayoutDashboard, LogOut, Menu, Users, X, Zap } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { usePortalData } from "@/components/providers/portal-data-provider";

const links = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/recursos", label: "Recursos", icon: Users },
  { href: "/projetos", label: "Projetos / SGs", icon: BriefcaseBusiness },
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/certificacoes", label: "Certificações", icon: Award },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDemo, loading, loadError, configurationError } = usePortalData();
  const [authorized, setAuthorized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "Hygor Henrique", role: "Líder técnico" });

  useEffect(() => {
    function authorizeUser(user: { email?: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> } | null) {
      if (!user || !["tech_lead", "admin"].includes(String(user.app_metadata.portal_role))) {
        setAuthorized(false);
        router.replace("/login");
        return;
      }
      const name = String(user.user_metadata.full_name || user.email || "Líder técnico");
      setProfile({ name, role: user.app_metadata.portal_role === "admin" ? "Administrador" : "Líder técnico" });
      setAuthorized(true);
    }

    async function verifySession() {
      if (configurationError) {
        setAuthorized(true);
        return;
      }
      if (isDemo) {
        if (localStorage.getItem("nexo-demo-session") === "active") setAuthorized(true);
        else router.replace("/login");
        return;
      }
      const { data } = await getSupabaseClient()!.auth.getUser();
      authorizeUser(data.user);
    }
    void verifySession();

    if (isDemo || configurationError) return;
    const { data: subscription } = getSupabaseClient()!.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        router.replace("/login");
      } else if (session?.user) authorizeUser(session.user);
    });
    return () => subscription.subscription.unsubscribe();
  }, [configurationError, isDemo, router]);

  async function logout() {
    if (isDemo) localStorage.removeItem("nexo-demo-session");
    else if (!configurationError) await getSupabaseClient()!.auth.signOut();
    router.push("/login");
  }

  if (!authorized) return <div className="loading-screen"><div><div className="loading-mark" />Verificando acesso</div></div>;

  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

  return (
    <div className="app-shell">
      {menuOpen && <button aria-label="Fechar menu" className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Zap /></span>
          Gestão de Recursos
        </Link>
        <div className="side-section-label">Operação</div>
        <nav className="side-nav" aria-label="Navegação principal">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={`side-link ${active ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
                <link.icon />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="side-spacer" />
        {isDemo && <div className="demo-chip"><Info />Modo demonstração. As alterações ficam salvas neste navegador.</div>}
        <div className="sidebar-user">
          <div className="avatar">{profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <strong>{profile.name}</strong>
            <span>{profile.role}</span>
          </div>
          <button aria-label="Sair" title="Sair" onClick={logout}><LogOut /></button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <div className="today">{today}</div>
          <div className="topbar-actions">
            <button className="icon-btn notification-btn" aria-label="Notificações"><Bell /></button>
          </div>
        </header>
        {loading ? <div className="loading-screen"><div><div className="loading-mark" />Carregando operação</div></div> : loadError ? <div className="loading-screen"><div className="empty-state"><h3>Dados indisponíveis</h3><p>{loadError}</p><button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={logout}>Voltar ao login</button></div></div> : children}
      </main>
    </div>
  );
}
