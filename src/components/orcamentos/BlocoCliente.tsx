"use client";

import { useEffect, useRef, useState } from "react";
import { classeEntrada } from "@/components/ui/CampoAuto";
import { Campo } from "@/components/ui/Campo";
import { clienteVazio, type ClienteForm } from "@/lib/orcamento";
import { supabaseNavegador } from "@/lib/supabase/client";
import { termosBusca } from "@/lib/texto";
import { COLUNAS_CLIENTE, type Cliente } from "@/lib/tipos";

/** Busca com sugestões entre os clientes salvos; se não existir, os campos abrem ali mesmo. */
export function BlocoCliente({ cliente, aoMudar }: { cliente: ClienteForm | null; aoMudar: (c: ClienteForm | null) => void }) {
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function buscar(v: string) {
    setTexto(v);
    setAberto(true);
    setAtivo(0);
    clearTimeout(timer.current);
    const termos = termosBusca(v);
    if (!termos.length) return setSugestoes([]);
    timer.current = setTimeout(async () => {
      let q = supabaseNavegador().from("clientes").select(COLUNAS_CLIENTE).order("nome").limit(8);
      for (const t of termos) q = q.ilike("busca", `%${t}%`);
      const { data } = await q;
      setSugestoes((data as Cliente[]) ?? []);
    }, 200);
  }

  function escolher(c: Cliente | null) {
    aoMudar(
      c
        ? { id: c.id, nome: c.nome, cpf_cnpj: c.cpf_cnpj ?? "", telefone: c.telefone ?? "", email: c.email ?? "", endereco: c.endereco ?? "" }
        : clienteVazio(texto.trim()),
    );
    setTexto("");
    setAberto(false);
  }

  if (!cliente) {
    const opcoes = [...sugestoes.map((s) => ({ tipo: "existente" as const, s })), ...(texto.trim() ? [{ tipo: "novo" as const }] : [])];
    return (
      <div className="relative">
        <label htmlFor="busca-cliente" className="rotulo mb-1.5 block">
          Cliente
        </label>
        <input
          id="busca-cliente"
          role="combobox"
          aria-expanded={aberto && opcoes.length > 0}
          aria-controls="sugestoes-cliente"
          aria-autocomplete="list"
          autoComplete="off"
          className={classeEntrada}
          placeholder="Buscar cliente salvo ou digitar o nome de um novo"
          value={texto}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => texto && setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={(e) => {
            if (!opcoes.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAtivo((a) => (a + 1) % opcoes.length);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setAtivo((a) => (a - 1 + opcoes.length) % opcoes.length);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const o = opcoes[ativo];
              escolher(o.tipo === "existente" ? o.s : null);
            }
          }}
        />
        {aberto && opcoes.length > 0 && (
          <ul id="sugestoes-cliente" role="listbox" className="absolute inset-x-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-ad border border-linha bg-superficie shadow-ad">
            {opcoes.map((o, i) => (
              <li
                key={o.tipo === "existente" ? o.s.id : "novo"}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(o.tipo === "existente" ? o.s : null);
                }}
                className={`cursor-pointer px-4 py-3 ${i === ativo ? "bg-fundo" : ""} ${o.tipo === "novo" ? "border-t border-linha" : ""}`}
              >
                {o.tipo === "existente" ? (
                  <>
                    <span className="block text-tinta">{o.s.nome}</span>
                    <span className="text-sm text-tinta-suave">{[o.s.telefone, o.s.email].filter(Boolean).join(" · ") || "Cliente salvo"}</span>
                  </>
                ) : (
                  <span className="text-bronze">+ Cadastrar “{texto.trim()}” como cliente novo</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const muda = (k: keyof ClienteForm) => (e: React.ChangeEvent<HTMLInputElement>) => aoMudar({ ...cliente, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rotulo">{cliente.id ? "Cliente salvo" : "Cliente novo — será salvo junto com o orçamento"}</span>
        <button type="button" onClick={() => aoMudar(null)} className="min-h-10 text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline">
          Trocar cliente
        </button>
      </div>
      <Campo rotulo="Nome do cliente" value={cliente.nome} onChange={muda("nome")} required erro={cliente.nome.trim() ? undefined : "O nome é obrigatório."} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo rotulo="Telefone / WhatsApp" value={cliente.telefone} onChange={muda("telefone")} inputMode="tel" placeholder="(45) 99999-9999" />
        <Campo rotulo="CPF / CNPJ" value={cliente.cpf_cnpj} onChange={muda("cpf_cnpj")} inputMode="numeric" />
      </div>
      <Campo rotulo="E-mail" value={cliente.email} onChange={muda("email")} inputMode="email" type="email" />
      <Campo rotulo="Endereço da obra" value={cliente.endereco} onChange={muda("endereco")} />
    </div>
  );
}
