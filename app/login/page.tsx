"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Zap } from "lucide-react";
import { usePortalData } from "@/components/providers/portal-data-provider";
import { getSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { isDemo, configurationError } = usePortalData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    if (configurationError) {
      setError(configurationError);
      setSubmitting(false);
      return;
    }
    if (isDemo) {
      localStorage.setItem("nexo-demo-session", "active");
      router.push("/");
      return;
    }
    const { data, error: authError } = await getSupabaseClient()!.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
      setSubmitting(false);
      return;
    }
    if (!data.user || !["tech_lead", "admin"].includes(String(data.user.app_metadata.portal_role))) {
      await getSupabaseClient()!.auth.signOut();
      setError("Este usuário não possui acesso de líder técnico ao portal.");
      setSubmitting(false);
      return;
    }
    router.push("/");
  }

  return (
    <main className="login-page">
      <section className="login-form-side">
        <div className="brand"><span className="brand-mark"><Zap /></span>Gestão de Recursos</div>
        <div className="login-content">
          <div className="login-eyebrow">Portal de liderança técnica</div>
          <h1>Bem-vindo<br />de volta.</h1>
          <p>Entre para acompanhar o ritmo do time, antecipar riscos e manter cada entrega no rumo.</p>
          <form className="login-form" onSubmit={login}>
            {!isDemo && (
              <>
                <label className="field"><span>E-mail corporativo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" required autoComplete="email" /></label>
                <label className="field"><span>Senha</span><div style={{ position: "relative" }}><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required autoComplete="current-password" style={{ paddingRight: 44 }} /><button type="button" className="table-action" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 5, top: 7 }}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
              </>
            )}
            {(configurationError || error) && <div className="login-error" role="alert">{configurationError || error}</div>}
            <button className="btn btn-primary btn-large" disabled={submitting || Boolean(configurationError)}>{isDemo ? "Explorar demonstração" : submitting ? "Entrando..." : "Entrar no portal"}<ArrowRight /></button>
          </form>
          {isDemo && <p className="login-note">Nenhuma credencial necessária no ambiente de demonstração.</p>}
        </div>
      </section>
      <section className="login-visual" aria-label="Resumo operacional do portal">
        <div className="visual-copy">
          <div className="visual-kicker"><span className="live-dot" />Radar operacional online</div>
          <h2>Clareza para liderar antes do gargalo.</h2>
          <p>Capacity, projetos, serviços e evolução técnica do time conectados em uma visão que conduz decisões.</p>
        </div>
        <div className="visual-board">
          <div className="visual-stat"><span>Capacity do time</span><strong>86%</strong></div>
          <div className="visual-stat"><span>Entregas ativas</span><strong>04</strong></div>
          <div className="visual-stat alert"><span>Pontos de atenção</span><strong>02</strong></div>
        </div>
      </section>
    </main>
  );
}
