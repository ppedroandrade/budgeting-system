"use client";

import { useState } from "react";
import { salvarCampo } from "./actions";
import { CampoAuto as CampoBase, IndicadorSalvo as Indicador, useAutosave as useAutosaveBase } from "@/components/ui/CampoAuto";
import { UploadLogo } from "./UploadLogo";

const useAutosave = (campo: keyof Empresa, inicial: string) => useAutosaveBase(salvarCampo, campo, inicial);

function CampoAuto(props: Omit<React.ComponentProps<typeof CampoBase>, "salvarCampo"> & { campo: keyof Empresa }) {
  return <CampoBase salvarCampo={salvarCampo} {...props} />;
}

export type Empresa = {
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
  site: string;
  horario: string;
  logo_url: string | null;
  modo_calculo: "A" | "B";
  pct_padrao: number;
  validade_dias: number;
  condicoes_padrao: string;
  observacoes_padrao: string;
  pdf_mostrar_pct: boolean;
};

function ModoCalculo({ inicial }: { inicial: "A" | "B" }) {
  const [modo, setModo] = useState(inicial);
  const { estado, erro, salvar } = useAutosave("modo_calculo", inicial);

  function escolher(novo: "A" | "B") {
    if (novo === modo) return;
    const como = novo === "A" ? "à prazo" : "à vista";
    const ok = window.confirm(
      `Os preços do catálogo passarão a ser interpretados como ${como}. Orçamentos já criados não mudam.\n\nConfirmar a troca?`,
    );
    if (!ok) return;
    setModo(novo);
    salvar(novo);
  }

  const opcoes = [
    { v: "A" as const, titulo: "Modo A — informar preço à prazo", desc: "Preço à vista = preço à prazo × (1 − %)" },
    { v: "B" as const, titulo: "Modo B — informar preço à vista", desc: "Preço à prazo = preço à vista × (1 + %)" },
  ];

  return (
    <fieldset>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <legend className="rotulo">Modo de cálculo do preço</legend>
        <Indicador estado={estado} erro={erro} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {opcoes.map((o) => (
          <label
            key={o.v}
            className={`flex cursor-pointer gap-3 rounded-ad border p-4 transition-colors ${modo === o.v ? "border-bronze bg-bronze/5" : "border-linha bg-superficie"}`}
          >
            <input type="radio" name="modo" className="mt-1 accent-[var(--ad-accent)]" checked={modo === o.v} onChange={() => escolher(o.v)} />
            <span>
              <span className="block text-tinta">{o.titulo}</span>
              <span className="mt-1 block text-sm text-tinta-suave">{o.desc}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MostrarPct({ inicial }: { inicial: boolean }) {
  const [marcado, setMarcado] = useState(inicial);
  const { estado, erro, salvar } = useAutosave("pdf_mostrar_pct", String(inicial));
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex min-h-12 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-[var(--ad-accent)]"
          checked={marcado}
          onChange={(e) => {
            setMarcado(e.target.checked);
            salvar(String(e.target.checked));
          }}
        />
        <span>Mostrar a coluna de % de desconto por item no PDF</span>
      </label>
      <Indicador estado={estado} erro={erro} />
    </div>
  );
}

function Secao({ titulo, italico, children }: { titulo: string; italico: string; children: React.ReactNode }) {
  return (
    <section className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
      <h2 className="mb-6 font-display text-2xl">
        {titulo} <em className="text-bronze">{italico}</em>
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function FormConfiguracoes({ empresa: e }: { empresa: Empresa }) {
  return (
    <div className="space-y-8">
      <Secao titulo="Dados da" italico="empresa">
        <p className="-mt-3 text-sm text-tinta-suave">Saem no cabeçalho e no rodapé do PDF.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAuto campo="razao_social" rotulo="Razão social" inicial={e.razao_social} />
          <CampoAuto campo="cnpj" rotulo="CNPJ" inicial={e.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" />
        </div>
        <CampoAuto campo="endereco" rotulo="Endereço" inicial={e.endereco} />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAuto campo="telefone" rotulo="Telefone" inicial={e.telefone} inputMode="tel" />
          <CampoAuto campo="whatsapp" rotulo="WhatsApp da loja" inicial={e.whatsapp} inputMode="tel" />
          <CampoAuto campo="instagram" rotulo="Instagram" inicial={e.instagram} />
          <CampoAuto campo="site" rotulo="Site" inicial={e.site} />
        </div>
        <CampoAuto campo="horario" rotulo="Horário de atendimento" inicial={e.horario} />
      </Secao>

      <Secao titulo="Regras do" italico="orçamento">
        <ModoCalculo inicial={e.modo_calculo} />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAuto
            campo="pct_padrao"
            rotulo="% padrão por item"
            inicial={String(e.pct_padrao).replace(".", ",")}
            inputMode="decimal"
            ajuda="Cada item começa com este %; o vendedor pode mudar item a item."
          />
          <CampoAuto
            campo="validade_dias"
            rotulo="Validade padrão (dias)"
            inicial={String(e.validade_dias)}
            inputMode="numeric"
            ajuda="Validade = data do orçamento + estes dias."
          />
        </div>
      </Secao>

      <Secao titulo="Textos" italico="padrão">
        <CampoAuto campo="condicoes_padrao" rotulo="Condições de pagamento" inicial={e.condicoes_padrao} multilinha />
        <CampoAuto campo="observacoes_padrao" rotulo="Observações" inicial={e.observacoes_padrao} multilinha />
      </Secao>

      <Secao titulo="Opções do" italico="PDF">
        <MostrarPct inicial={e.pdf_mostrar_pct} />
        <UploadLogo inicial={e.logo_url} />
      </Secao>
    </div>
  );
}
