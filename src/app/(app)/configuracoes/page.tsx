import { FormConfiguracoes, type Empresa } from "./FormConfiguracoes";
import { Titulo } from "@/components/ui/Titulo";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export default async function Configuracoes() {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("empresa").select("*").eq("id", 1).single<Empresa>();

  return (
    <div className="max-w-3xl">
      <Titulo italico="do sistema." className="mb-3">
        Configurações
      </Titulo>
      <p className="mb-8 text-tinta-suave">Tudo aqui salva sozinho ao sair de cada campo.</p>
      {data && <FormConfiguracoes empresa={{ ...data, pct_padrao: Number(data.pct_padrao) }} />}
    </div>
  );
}
