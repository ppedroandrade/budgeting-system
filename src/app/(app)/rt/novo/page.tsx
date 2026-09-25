import { FormNovo } from "./FormNovo";
import { Titulo } from "@/components/ui/Titulo";
import { hojeISO } from "@/lib/orcamento";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export default async function NovoLancamento() {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const [{ data: arqs }, { data: cfg }] = await Promise.all([
    supabase.from("arquitetos").select("nome").eq("ativo", true).order("nome"),
    supabase.from("rt_config").select("pct_padrao").eq("id", 1).single(),
  ]);
  const hoje = hojeISO();
  return (
    <div className="max-w-xl">
      <Titulo sobrancelha="RT" italico="lançamento." className="mb-3">
        Novo
      </Titulo>
      <p className="mb-8 text-tinta-suave">Para vendas indicadas que não passaram por um orçamento do sistema. As indicações aprovadas pelo sistema entram sozinhas.</p>
      <div className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
        <FormNovo arquitetos={(arqs ?? []).map((a) => a.nome)} mes={hoje.slice(0, 7)} hoje={hoje} pctPadrao={String(cfg?.pct_padrao ?? 5).replace(".", ",").replace(/,00$/, "")} />
      </div>
    </div>
  );
}
