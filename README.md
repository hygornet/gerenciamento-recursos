# Nexo - Portal de liderança técnica

Portal Node.js para acompanhar recursos, capacity, projetos, serviços gerenciados e certificações Microsoft. A aplicação usa Next.js, TypeScript e Supabase.

## Executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. Durante o desenvolvimento, sem variáveis do Supabase, o portal inicia em modo demonstração e persiste alterações no `localStorage` do navegador.

## Conectar ao Supabase

1. Crie um projeto no Supabase.
2. Aplique a migration pelo CLI para manter o histórico do banco:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

3. Opcionalmente, execute `supabase/seed.sql` para carregar os dados de exemplo.
4. Crie um usuário em **Authentication > Users** e mantenha o cadastro público desabilitado.
5. No usuário, defina `app_metadata.portal_role` como `tech_lead` ou `admin` usando uma API administrativa segura. Esse campo não deve ficar em `user_metadata`.
6. Opcionalmente, defina `user_metadata.full_name` para exibir o nome no menu.
7. Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável.
8. Reinicie `npm run dev` e entre com o usuário criado.

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave
```

Nunca exponha uma chave `sb_secret_...` ou `service_role` no frontend.

## Publicar na Vercel

Depois de aplicar a migration e criar o primeiro usuário:

1. Importe o repositório na Vercel ou execute `npx vercel`.
2. Em **Settings > Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para Production e Preview.
3. Execute um novo deploy, pois variáveis `NEXT_PUBLIC_*` são incorporadas no build.
4. No Supabase, ajuste **Authentication > URL Configuration > Site URL** para o domínio oficial da Vercel.
5. Valide login, leitura e uma operação de criação/edição com um usuário `tech_lead`.

Em builds de produção sem as variáveis do Supabase, a aplicação mostra um erro de configuração em vez de abrir o modo demonstração. Para habilitar uma demo intencional em um preview, defina `NEXT_PUBLIC_ENABLE_DEMO_MODE=true`.

## Scripts

- `npm run dev`: ambiente de desenvolvimento
- `npm run lint`: análise estática
- `npm run build`: build otimizado de produção
- `npm start`: inicia o build de produção

## Estrutura

- `app/`: rotas, login e páginas do portal
- `components/`: shell, dashboard, formulários e CRUDs
- `lib/`: tipos, cliente Supabase e dados de demonstração
- `supabase/`: migration com RLS e seed opcional

As policies exigem `app_metadata.portal_role` com valor `tech_lead` ou `admin`. O campo `app_metadata` só pode ser alterado com credenciais administrativas do Supabase; nunca exponha essas credenciais no navegador.
