import { criarVendedor } from "../actions";
import { FormVendedor } from "../FormVendedor";
import { Titulo } from "@/components/ui/Titulo";
import { exigirAdmin } from "@/lib/sessao";

export default async function NovoVendedor() {
  await exigirAdmin();
  return (
    <div className="max-w-xl">
      <Titulo sobrancelha="Vendedores" italico="vendedor." className="mb-8">
        Novo
      </Titulo>
      <div className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
        <FormVendedor acao={criarVendedor} novo />
      </div>
    </div>
  );
}
