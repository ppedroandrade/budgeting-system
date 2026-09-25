"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { paraPayload, problemaParaSalvar, temConteudo, type OrcamentoForm } from "@/lib/orcamento";

export type EstadoSalvamento = "ocioso" | "aguardando" | "salvando" | "salvo" | "pendente" | "erro";

export type RespostaServidor = {
  id: string;
  numero: string;
  status: OrcamentoForm["status"];
  validade: string;
  cliente_id: string | null;
  atualizado_em: string;
  total_prazo: number;
  total_vista: number;
};

const ESPERA_MS = 700;
const NOVA_TENTATIVA_MS = 5000;

export const chaveRascunho = (id: string | null) => `ad-orcamento:${id ?? "novo"}`;

export function lerRascunhoLocal(id: string | null): { form: OrcamentoForm; em: number } | null {
  try {
    const bruto = localStorage.getItem(chaveRascunho(id));
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravarLocal(form: OrcamentoForm) {
  try {
    localStorage.setItem(chaveRascunho(form.id), JSON.stringify({ form, em: Date.now() }));
  } catch {
    // modo privado / armazenamento cheio: segue só com o servidor
  }
}

export function apagarRascunhoLocal(id: string | null) {
  try {
    localStorage.removeItem(chaveRascunho(id));
  } catch {}
}

/**
 * Salvamento automático do orçamento.
 * 1. Toda alteração vai na hora para o aparelho (localStorage) — fechar a aba não perde nada.
 * 2. Depois de uma pausa na digitação, vai para o servidor (uma gravação por vez; a última sempre vence).
 */
export function useSalvamento(
  form: OrcamentoForm,
  opcoes: { admin: boolean; aoCriar: (r: RespostaServidor) => void; aoSalvar: (r: RespostaServidor) => void },
) {
  const [estado, setEstado] = useState<EstadoSalvamento>(form.id ? "salvo" : "ocioso");
  const [mensagem, setMensagem] = useState("");
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);

  const formRef = useRef(form);
  const opcoesRef = useRef(opcoes);
  const salvando = useRef(false);
  const deNovo = useRef(false);
  const ultimoEnviado = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const primeira = useRef(true);
  const enviarRef = useRef<() => Promise<boolean>>(async () => true);
  const ultima = useRef<{ id: string; numero: string } | null>(form.id && form.numero ? { id: form.id, numero: form.numero } : null);

  useEffect(() => {
    formRef.current = form;
    opcoesRef.current = opcoes;
  });

  const enviar = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    const f = formRef.current;
    if (!f.id && !temConteudo(f)) return true;
    const problema = problemaParaSalvar(f);
    if (problema) {
      setEstado("pendente");
      setMensagem(problema);
      return false;
    }
    if (salvando.current) {
      deNovo.current = true;
      return false;
    }
    const payload = paraPayload(f, opcoesRef.current.admin);
    const json = JSON.stringify(payload);
    if (json === ultimoEnviado.current) {
      setEstado("salvo");
      return true;
    }

    salvando.current = true;
    setEstado("salvando");
    const { data, error } = await supabaseNavegador().rpc("salvar_orcamento", { p: payload });
    salvando.current = false;

    if (error || !data) {
      const semRede = !navigator.onLine || /fetch|network/i.test(error?.message ?? "");
      setEstado("erro");
      setMensagem(
        semRede
          ? "Sem conexão. Está guardado neste aparelho e será enviado assim que a internet voltar."
          : (error?.message ?? "Não foi possível salvar."),
      );
      timer.current = setTimeout(() => void enviarRef.current(), NOVA_TENTATIVA_MS);
      return false;
    }

    const r = data as RespostaServidor;
    ultima.current = { id: r.id, numero: r.numero };
    ultimoEnviado.current = JSON.stringify({ ...payload, id: r.id });
    if (!f.id) {
      apagarRascunhoLocal(null);
      opcoesRef.current.aoCriar(r);
    } else {
      opcoesRef.current.aoSalvar(r);
    }
    // Se nada mudou enquanto salvava, o rascunho local não é mais necessário.
    if (JSON.stringify(paraPayload({ ...formRef.current, id: r.id }, opcoesRef.current.admin)) === ultimoEnviado.current) {
      apagarRascunhoLocal(r.id);
    }
    setSalvoEm(new Date());
    setMensagem("");
    setEstado("salvo");

    if (deNovo.current) {
      deNovo.current = false;
      return enviarRef.current();
    }
    return true;
  }, []);

  useEffect(() => {
    enviarRef.current = enviar;
  }, [enviar]);

  // A cada alteração: guarda no aparelho e agenda o envio.
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      // Ao abrir um orçamento salvo, o que veio do servidor é a base.
      if (form.id && !problemaParaSalvar(form)) ultimoEnviado.current = JSON.stringify(paraPayload(form, opcoes.admin));
      return;
    }
    gravarLocal(form);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void enviar(), ESPERA_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, enviar]);

  // Tenta enviar na hora ao esconder a aba ou quando a internet volta.
  useEffect(() => {
    const agora = () => void enviar();
    const aoEsconder = () => document.visibilityState === "hidden" && agora();
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("online", agora);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("online", agora);
      clearTimeout(timer.current);
    };
  }, [enviar]);

  /** Salva agora e devolve id/número do orçamento (ou null se não deu para salvar). */
  const salvarAgora = useCallback(async () => ((await enviar()) ? ultima.current : null), [enviar]);
  return { estado, mensagem, salvoEm, salvarAgora };
}
