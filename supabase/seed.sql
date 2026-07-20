insert into public.resources (id, name, email, role, location, status, weekly_capacity) values
  ('10000000-0000-0000-0000-000000000001', 'Marina Costa', 'marina.costa@nexo.dev', 'Senior Cloud Engineer', 'São Paulo, SP', 'Ativo', 40),
  ('10000000-0000-0000-0000-000000000002', 'Rafael Martins', 'rafael.martins@nexo.dev', 'Power Platform Specialist', 'Campinas, SP', 'Ativo', 40),
  ('10000000-0000-0000-0000-000000000003', 'Aline Rocha', 'aline.rocha@nexo.dev', 'Data Engineer', 'Recife, PE', 'Ativo', 40),
  ('10000000-0000-0000-0000-000000000004', 'Diego Nunes', 'diego.nunes@nexo.dev', 'Software Engineer', 'Belo Horizonte, MG', 'Férias', 20),
  ('10000000-0000-0000-0000-000000000005', 'Beatriz Lima', 'beatriz.lima@nexo.dev', 'Cloud Architect', 'Curitiba, PR', 'Ativo', 40),
  ('10000000-0000-0000-0000-000000000006', 'Lucas Freitas', 'lucas.freitas@nexo.dev', 'Junior Consultant', 'Fortaleza, CE', 'Ativo', 40)
on conflict do nothing;

insert into public.resource_skills (resource_id, skill_name, level) values
  ('10000000-0000-0000-0000-000000000001', 'Azure', 5),
  ('10000000-0000-0000-0000-000000000001', 'Terraform', 4),
  ('10000000-0000-0000-0000-000000000002', 'Power Apps', 5),
  ('10000000-0000-0000-0000-000000000002', 'Copilot Studio', 4),
  ('10000000-0000-0000-0000-000000000003', 'Microsoft Fabric', 4),
  ('10000000-0000-0000-0000-000000000003', 'Python', 5),
  ('10000000-0000-0000-0000-000000000004', '.NET', 5),
  ('10000000-0000-0000-0000-000000000005', 'Architecture', 5),
  ('10000000-0000-0000-0000-000000000005', 'FinOps', 4),
  ('10000000-0000-0000-0000-000000000006', 'Power BI', 3)
on conflict do nothing;

insert into public.clients (id, name, status) values
  ('30000000-0000-0000-0000-000000000001', 'Contoso Varejo', 'Ativo'),
  ('30000000-0000-0000-0000-000000000002', 'Fabrikam Saúde', 'Ativo'),
  ('30000000-0000-0000-0000-000000000003', 'Northwind Logística', 'Ativo'),
  ('30000000-0000-0000-0000-000000000004', 'Adventure Works', 'Ativo')
on conflict do nothing;

insert into public.engagements (id, client_id, name, client, type, status, start_date, end_date, contracted_hours, consumed_hours, description) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Landing Zone Azure', 'Contoso Varejo', 'Projeto', 'Em andamento', '2026-06-02', '2026-09-30', 720, 418, 'Implantação da fundação cloud e governança de subscriptions.'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Evolução Power Platform', 'Fabrikam Saúde', 'Serviço gerenciado', 'Em andamento', '2026-01-10', '2026-12-20', 960, 646, 'Sustentação e evolução mensal do portfólio de aplicações.'),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Data Hub Fabric', 'Northwind Logística', 'Projeto', 'Em risco', '2026-04-15', '2026-08-22', 580, 487, 'Modernização da plataforma analítica com Microsoft Fabric.'),
  ('20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'Cloud Advisory', 'Adventure Works', 'Serviço gerenciado', 'Em andamento', '2026-03-01', '2027-02-28', 480, 172, 'Aconselhamento técnico, FinOps e apoio à arquitetura.')
on conflict do nothing;

insert into public.allocations (engagement_id, resource_id, hours) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 24),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 16),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 28),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 8),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 42),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 16)
on conflict do nothing;

insert into public.certifications (code, name, level, renewal_months, holders) values
  ('AZ-305', 'Azure Solutions Architect Expert', 'Expert', 12, 2),
  ('AZ-104', 'Azure Administrator Associate', 'Associate', 12, 3),
  ('PL-600', 'Power Platform Solution Architect Expert', 'Expert', 12, 1),
  ('DP-600', 'Fabric Analytics Engineer Associate', 'Associate', 12, 2),
  ('AI-102', 'Azure AI Engineer Associate', 'Associate', 12, 1),
  ('SC-100', 'Cybersecurity Architect Expert', 'Expert', 12, 0)
on conflict do nothing;
