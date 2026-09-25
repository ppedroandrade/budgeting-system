import { notFound } from "next/navigation";
import { TelaProduto } from "../TelaProduto";
import { Titulo } from "@/components/ui/Titulo";
import { lerEmpresa } from "@/lib/empresa";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { COLUNAS_PRODUTO, type Produto } from "@/lib/tipos";

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const supabase = await supabaseServidor();
  const [{ data: produto }, empresa] = await Promise.all([
    supabase.from("produtos").select(COLUNAS_PRODUTO).eq("id", id).maybeSingle<Produto>(),
    lerEmpresa(),
  ]);
  if (!produto) notFound();

  return (
    <div className="max-w-4xl">
      <Titulo sobrancelha={produto.ativo ? produto.marca || "Catálogo" : "Produto desativado"} italico={produto.nome} className="mb-8">
        {""}
      </Titulo>
      <TelaProduto produto={produto} modo={empresa.modo_calculo} admin={usuario.perfil === "admin"} />
    </div>
  );
}
