import { TelaProduto } from "../TelaProduto";
import { Titulo } from "@/components/ui/Titulo";
import { lerEmpresa } from "@/lib/empresa";
import { exigirUsuario } from "@/lib/sessao";

export default async function NovoProduto() {
  const usuario = await exigirUsuario();
  const empresa = await lerEmpresa();
  return (
    <div className="max-w-4xl">
      <Titulo sobrancelha="Catálogo" italico="produto." className="mb-8">
        Novo
      </Titulo>
      <TelaProduto modo={empresa.modo_calculo} admin={usuario.perfil === "admin"} />
    </div>
  );
}
