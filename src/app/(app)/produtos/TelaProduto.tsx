"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { alterarAtivoProduto } from "./actions";
import { FormProduto } from "@/components/produtos/FormProduto";
import { Botao } from "@/components/ui/Botao";
import type { Produto } from "@/lib/tipos";

export function TelaProduto({ produto, modo, admin }: { produto?: Produto; modo: "A" | "B"; admin: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <>
      <div className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
        <FormProduto
          produto={produto}
          modo={modo}
          aoSalvar={() => {
            router.push("/produtos");
            router.refresh();
          }}
          aoCancelar={() => router.push("/produtos")}
          textoSalvar={produto ? "Salvar alterações" : "Cadastrar produto"}
        />
      </div>
      {produto && admin && (
        <section className="mt-10 border-t border-linha pt-8">
          <h2 className="rotulo mb-2">{produto.ativo ? "Desativar produto" : "Reativar produto"}</h2>
          <p className="mb-4 text-sm text-tinta-suave">
            {produto.ativo
              ? "Some do catálogo e da busca do orçamento. Orçamentos que já usam o produto não mudam."
              : "Volta a aparecer no catálogo e na busca do orçamento."}
          </p>
          <Botao
            variante={produto.ativo ? "perigo" : "secundario"}
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                await alterarAtivoProduto(produto.id, !produto.ativo);
                router.push("/produtos");
                router.refresh();
              })
            }
          >
            {produto.ativo ? "Desativar produto" : "Reativar produto"}
          </Botao>
        </section>
      )}
    </>
  );
}
