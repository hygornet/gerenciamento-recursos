import type { Metadata } from "next";
import "./globals.css";
import { PortalDataProvider } from "@/components/providers/portal-data-provider";

export const metadata: Metadata = {
  title: "Gestão de Recursos",
  description: "Capacity, projetos e desenvolvimento do time em um único lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <PortalDataProvider>{children}</PortalDataProvider>
      </body>
    </html>
  );
}
