import { notFound } from "next/navigation";
import { alterarAtivo, editarVendedor } from "../actions";
import { FormVendedor } from "../FormVendedor";
import { Botao } from "@/components/ui/Botao";
import { Titulo } from "@/components/ui/Titulo";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { telefone } from "@/lib/formato";

export default async function EditarVendedor({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirAdmin();
  const { id } = await params;
  const supabase = await supabaseServidor();
  const { data: v } = await supabase
    .from("usuarios")
    .select("id, nome, email, whatsapp, perfil, ativo")
    .eq("id", id)
    .maybeSingle();
  if (!v) notFound();

  const souEu = v.id === eu.id;

  return (
    <div className="max-w-xl">
      <Titulo sobrancelha={v.ativo ? "Vendedor ativo" : "Vendedor desativado"} italico={v.nome} className="mb-8">
        Editar
      </Titulo>
      <div className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
        <FormVendedor
          acao={editarVendedor.bind(null, v.id)}
          valores={{ nome: v.nome, email: v.email, whatsapp: telefone(v.whatsapp) }}
          novo={false}
        />
      </div>

      {!souEu && (
        <section className="mt-10 border-t border-linha pt-8">
          <h2 className="rotulo mb-2">{v.ativo ? "Desativar acesso" : "Reativar acesso"}</h2>
          <p className="mb-4 text-sm text-tinta-suave">
            {v.ativo
              ? "O vendedor não conseguirá mais entrar no sistema. Os orçamentos dele continuam guardados e visíveis para o admin."
              : "O vendedor volta a entrar com a mesma senha de antes."}
          </p>
          <form action={alterarAtivo.bind(null, v.id, !v.ativo)}>
            <Botao variante={v.ativo ? "perigo" : "secundario"}>{v.ativo ? "Desativar vendedor" : "Reativar vendedor"}</Botao>
          </form>
        </section>
      )}
    </div>
  );
}
