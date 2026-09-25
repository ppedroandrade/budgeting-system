import { useId } from "react";

const classeEntrada =
  "block w-full min-h-12 rounded-[var(--ad-radius-sm)] border border-linha bg-superficie px-3.5 text-base text-tinta placeholder:text-tinta-suave/60 focus:border-bronze focus:outline-none disabled:bg-fundo";

export function Campo({
  rotulo,
  ajuda,
  erro,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string; ajuda?: string; erro?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo mb-1.5 block">
        {rotulo}
      </label>
      <input id={id} className={classeEntrada} aria-invalid={Boolean(erro)} {...props} />
      {ajuda && !erro && <p className="mt-1 text-sm text-tinta-suave">{ajuda}</p>}
      {erro && <p className="mt-1 text-sm text-perigo">{erro}</p>}
    </div>
  );
}

export function AreaTexto({
  rotulo,
  ajuda,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo: string; ajuda?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo mb-1.5 block">
        {rotulo}
      </label>
      <textarea id={id} rows={3} className={`${classeEntrada} py-3 leading-relaxed`} {...props} />
      {ajuda && <p className="mt-1 text-sm text-tinta-suave">{ajuda}</p>}
    </div>
  );
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "ok" | "info"; children: React.ReactNode }) {
  const cores = {
    erro: "border-perigo/30 bg-perigo/5 text-perigo",
    ok: "border-sucesso/30 bg-sucesso/5 text-sucesso",
    info: "border-linha bg-superficie text-tinta-suave",
  }[tipo];
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-ad border px-4 py-3 text-sm ${cores}`}>
      {children}
    </p>
  );
}
