import Link from "next/link";
import { notFound } from "next/navigation";
import { salvarCampoArquiteto } from "../../actions";
import { CaixaAuto } from "@/components/ui/AutoOpcoes";
import { CampoAuto } from "@/components/ui/CampoAuto";
import { Titulo } from "@/components/ui/Titulo";
import { paraCampoDecimal } from "@/lib/calculo";
import { moeda } from "@/lib/formato";
import { lerLancamentos, somar } from "@/lib/rt";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export default async function Arquiteto({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await supabaseServidor();
  const { data: a } = await supabase.from("arquitetos").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const lancs = (await lerLancamentos({ mes: "todos", arquiteto: id })).filter((l) => !l.cancelado);
  const salvar = salvarCampoArquiteto.bind(null, a.id);

  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm">
        <Link href="/rt?aba=arquitetos" className="text-tinta-suave underline-offset-4 hover:underline">
          ← Cadastro de arquitetos
        </Link>
      </p>
      <Titulo sobrancelha={a.ativo ? "Arquiteto(a)" : "Arquiteto(a) inativo(a)"} italico={a.nome} className="mb-8">
        {""}
      </Titulo>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Vendas indicadas", String(lancs.length)],
            ["RT total", moeda(somar(lancs, "valor_rt"))],
            ["Já pago", moeda(somar(lancs, "pago"))],
            ["A pagar agora", moeda(somar(lancs, "saldo_a_pagar"))],
          ] as const
        ).map(([r, v]) => (
          <div key={r} className="rounded-ad border border-linha bg-superficie p-4">
            <p className="text-sm text-tinta-suave">{r}</p>
            <p className="numeros mt-1 text-lg text-tinta">{v}</p>
          </div>
        ))}
      </section>

      <div className="space-y-5 rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
        <CampoAuto salvarCampo={salvar} campo="nome" rotulo="Nome" inicial={a.nome} />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAuto salvarCampo={salvar} campo="telefone" rotulo="Telefone / WhatsApp" inicial={a.telefone ?? ""} inputMode="tel" />
          <CampoAuto salvarCampo={salvar} campo="email" rotulo="E-mail" inicial={a.email ?? ""} inputMode="email" />
        </div>
        <CampoAuto salvarCampo={salvar} campo="pix" rotulo="Chave PIX / dados para pagamento" inicial={a.pix ?? ""} />
        <CampoAuto
          salvarCampo={salvar}
          campo="pct_rt"
          rotulo="% de RT próprio (opcional)"
          inicial={a.pct_rt != null ? paraCampoDecimal(String(a.pct_rt)) : ""}
          inputMode="decimal"
          ajuda="Vazio = usa o % padrão. Vale para as próximas indicações."
        />
        <CampoAuto salvarCampo={salvar} campo="observacoes" rotulo="Observações" inicial={a.observacoes} multilinha />
        <CaixaAuto salvarCampo={salvar} campo="ativo" inicial={a.ativo} rotulo="Ativo (aparece nas sugestões do orçamento)" />
      </div>

      {lancs.length > 0 && (
        <p className="mt-6">
          <Link href={`/rt?aba=lancamentos&mes=todos&arquiteto=${a.id}`} className="text-bronze underline-offset-4 hover:underline">
            Ver os {lancs.length} lançamento(s) de RT →
          </Link>
        </p>
      )}
    </div>
  );
}
