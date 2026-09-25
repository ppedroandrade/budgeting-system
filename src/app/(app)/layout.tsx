import { Menu } from "@/components/layout/Menu";
import { itensDoMenu } from "@/components/layout/menu";
import { exigirUsuario } from "@/lib/sessao";

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <div className="lg:pl-64">
      <Menu itens={itensDoMenu(usuario.perfil)} nome={usuario.nome} perfil={usuario.perfil} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-14">{children}</main>
    </div>
  );
}
