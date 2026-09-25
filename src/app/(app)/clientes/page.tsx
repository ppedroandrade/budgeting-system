import Link from "next/link";
import { BotaoLink } from "@/components/ui/Botao";
import { Busca } from "@/components/ui/Busca";
import { Titulo } from "@/components/ui/Titulo";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { termosBusca } from "@/lib/texto";

type Linha = { id: string; nome: string; telefone: string | null; email: string | null; cpf_cnpj: string | null; orcamentos: { count: number }[] };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; limite?: string }> }) {
  await exigirUsuario();
  const sp = await searchParams;
  const limite = Math.min(Number(sp.limite) || 50, 1000);
  const supabase = await supabaseServidor();

  let q = supabase
    .from("clientes")
    .select("id, nome, telefone, email, cpf_cnpj, orcamentos(count)", { count: "exact" })
    .order("nome")
    .limit(limite);
  for (const t of termosBusca(sp.q)) q = q.ilike("busca", `%${t}%`);
  const { data, count } = await q.returns<Linha[]>();
  const lista = data ?? [];

  return (
    <>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Titulo italico="clientes.">Nossos</Titulo>
        <BotaoLink href="/orcamentos/novo" variante="secundario">
          Novo orçamento
        </BotaoLink>
      </div>
      <div className="mb-6 max-w-xl">
        <Busca placeholder="Buscar por nome, telefone, e-mail ou CPF/CNPJ" />
      </div>

      {lista.length === 0 ? (
        <p className="rounded-ad border border-linha bg-superficie px-5 py-10 text-center text-tinta-suave">
          {sp.q ? "Nenhum cliente encontrado." : "Os clientes aparecem aqui assim que forem usados num orçamento."}
        </p>
      ) : (
        <ul className="divide-y divide-linha rounded-ad border border-linha bg-superficie">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="grid gap-1 px-5 py-4 hover:bg-fundo sm:grid-cols-[1.5fr_1fr_1.4fr_auto] sm:items-center sm:gap-4">
                <span className="text-tinta">{c.nome}</span>
                <span className="text-sm text-tinta-suave">{c.telefone || "—"}</span>
                <span className="truncate text-sm text-tinta-suave">{c.email || "—"}</span>
                <span className="rotulo">{c.orcamentos?.[0]?.count ?? 0} orçam.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(count ?? 0) > lista.length && (
        <div className="mt-6 text-center">
          <BotaoLink variante="secundario" href={`/clientes?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), limite: String(limite + 50) })}`} scroll={false}>
            Mostrar mais
          </BotaoLink>
        </div>
      )}
    </>
  );
}
