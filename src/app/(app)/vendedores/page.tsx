import Link from "next/link";
import { BotaoLink } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Campo";
import { Titulo } from "@/components/ui/Titulo";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { telefone } from "@/lib/formato";

const MENSAGENS: Record<string, [string, "ok" | "erro"]> = {
  criado: ["Vendedor cadastrado. Já pode entrar com o e-mail e a senha inicial.", "ok"],
  salvo: ["Alterações salvas.", "ok"],
  desativado: ["Vendedor desativado. Ele não consegue mais entrar.", "ok"],
  reativado: ["Vendedor reativado.", "ok"],
  proprio: ["Você não pode desativar o seu próprio acesso.", "erro"],
  falha: ["Não foi possível alterar o acesso. Tente de novo.", "erro"],
};

export default async function Vendedores({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const msg = MENSAGENS[sp.ok ?? sp.erro ?? ""];

  const supabase = await supabaseServidor();
  const { data: lista = [] } = await supabase
    .from("usuarios")
    .select("id, nome, email, whatsapp, perfil, ativo")
    .order("ativo", { ascending: false })
    .order("nome");

  return (
    <>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Titulo italico="de vendas.">Equipe</Titulo>
        <BotaoLink href="/vendedores/novo">Novo vendedor</BotaoLink>
      </div>
      {msg && (
        <div className="mb-6">
          <Aviso tipo={msg[1]}>{msg[0]}</Aviso>
        </div>
      )}

      <ul className="divide-y divide-linha rounded-ad border border-linha bg-superficie">
        {(lista ?? []).map((v) => (
          <li key={v.id}>
            <Link
              href={`/vendedores/${v.id}`}
              className={`grid gap-1 px-5 py-4 transition-colors hover:bg-fundo sm:grid-cols-[1.4fr_1.6fr_1fr_auto] sm:items-center sm:gap-4 ${v.ativo ? "" : "opacity-55"}`}
            >
              <span className="text-tinta">
                {v.nome}
                {v.perfil === "admin" && <span className="rotulo ml-2 text-bronze">Admin</span>}
              </span>
              <span className="truncate text-sm text-tinta-suave">{v.email}</span>
              <span className="text-sm text-tinta-suave">{telefone(v.whatsapp) || "—"}</span>
              <span className={`rotulo ${v.ativo ? "text-sucesso" : "text-perigo"}`}>{v.ativo ? "Ativo" : "Desativado"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
