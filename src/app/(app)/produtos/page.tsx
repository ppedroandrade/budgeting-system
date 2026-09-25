import Link from "next/link";
import { Miniatura } from "@/components/produtos/Miniatura";
import { BotaoLink } from "@/components/ui/Botao";
import { Busca, FiltroUrl } from "@/components/ui/Busca";
import { Titulo } from "@/components/ui/Titulo";
import { lerEmpresa } from "@/lib/empresa";
import { moeda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { termosBusca } from "@/lib/texto";
import { COLUNAS_PRODUTO, type Produto } from "@/lib/tipos";

const POR_PAGINA = 48;

export default async function Produtos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; marca?: string; ver?: string; limite?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const sp = await searchParams;
  const empresa = await lerEmpresa();
  const supabase = await supabaseServidor();
  const limite = Math.min(Number(sp.limite) || POR_PAGINA, 1000);

  let q = supabase.from("produtos").select(COLUNAS_PRODUTO, { count: "exact" }).order("marca").order("nome").limit(limite);
  for (const t of termosBusca(sp.q)) q = q.ilike("busca", `%${t}%`);
  if (sp.marca) q = q.eq("marca", sp.marca);
  if (sp.ver !== "desativados") q = q.eq("ativo", true);
  else q = q.eq("ativo", false);

  const [{ data, count }, { data: marcas }] = await Promise.all([q.returns<Produto[]>(), supabase.rpc("marcas_usadas")]);
  const produtos = data ?? [];
  const mais = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  mais.set("limite", String(limite + POR_PAGINA));

  return (
    <>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Titulo italico="produtos.">Catálogo de</Titulo>
        <BotaoLink href="/produtos/novo">Novo produto</BotaoLink>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_14rem] lg:grid-cols-[1fr_14rem_12rem]">
        <Busca placeholder="Buscar por nome, marca ou referência" />
        <FiltroUrl
          param="marca"
          rotulo="Filtrar por marca"
          opcoes={[{ valor: "", rotulo: "Todas as marcas" }, ...((marcas as string[] | null) ?? []).map((m) => ({ valor: m, rotulo: m }))]}
        />
        {usuario.perfil === "admin" && (
          <FiltroUrl
            param="ver"
            rotulo="Mostrar"
            opcoes={[
              { valor: "", rotulo: "Ativos" },
              { valor: "desativados", rotulo: "Desativados" },
            ]}
          />
        )}
      </div>

      {produtos.length === 0 ? (
        <p className="rounded-ad border border-linha bg-superficie px-5 py-10 text-center text-tinta-suave">
          Nenhum produto encontrado. <Link href="/produtos/novo" className="underline underline-offset-4">Cadastrar produto</Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
          {produtos.map((p) => (
            <li key={p.id}>
              <Link href={`/produtos/${p.id}`} className="group block h-full overflow-hidden rounded-ad border border-linha bg-superficie transition-shadow hover:shadow-ad">
                <Miniatura url={p.foto_url} alt={p.nome} className="border-b border-linha p-3" />
                <div className="p-3 sm:p-4">
                  {p.marca && <p className="sobrancelha mb-1 text-[0.6875rem]">{p.marca}</p>}
                  <p className="line-clamp-2 leading-snug text-tinta">{p.nome}</p>
                  <p className="mt-1 truncate text-sm text-tinta-suave">{[p.referencia, p.acabamento].filter(Boolean).join(" · ") || " "}</p>
                  <p className="numeros mt-3 text-tinta">
                    {moeda(p.preco_base)}
                    <span className="text-sm text-tinta-suave"> /{p.unidade}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm text-tinta-suave">
        {produtos.length} de {count ?? produtos.length} produto(s) · preços {empresa.modo_calculo === "B" ? "à vista" : "à prazo"}
      </p>
      {(count ?? 0) > produtos.length && (
        <div className="mt-4 text-center">
          <BotaoLink href={`/produtos?${mais}`} variante="secundario" scroll={false}>
            Mostrar mais
          </BotaoLink>
        </div>
      )}
    </>
  );
}
