import Link from "next/link";

type Variante = "principal" | "secundario" | "bronze" | "perigo" | "texto";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-ad px-6 text-[0.8125rem] font-medium tracking-[0.16em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variantes: Record<Variante, string> = {
  principal: "bg-escuro text-white border border-escuro hover:bg-tinta",
  secundario: "bg-transparent text-tinta border border-escuro hover:bg-superficie",
  bronze: "bg-bronze text-white border border-bronze hover:brightness-95",
  perigo: "bg-transparent text-perigo border border-perigo/60 hover:bg-perigo/5",
  texto: "px-2 text-tinta-suave hover:text-tinta border border-transparent",
};

export function classeBotao(variante: Variante = "principal", extra = "") {
  return `${base} ${variantes[variante]} ${extra}`;
}

export function Botao({
  variante = "principal",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return <button className={classeBotao(variante, className)} {...props} />;
}

export function BotaoLink({
  variante = "principal",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={classeBotao(variante, className)} {...props} />;
}
