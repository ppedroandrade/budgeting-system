"use client";

import { useEffect, useRef, useState } from "react";
import { mesCurto, moeda, moedaCompacta } from "@/lib/formato";

export type Mes = { mes: string; aprovado: number; em_aberto: number; vencido: number };

// Paleta validada (CVD e contraste) — ver skill de dataviz. Ordem fixa.
export const SERIES = [
  { chave: "aprovado", rotulo: "Aprovado (entrou)", cor: "#1f8a5c" },
  { chave: "em_aberto", rotulo: "Em aberto", cor: "#c98a1e" },
  { chave: "vencido", rotulo: "Vencido (ficou para trás)", cor: "#b8432f" },
] as const;

const ALTURA = 240;
const M = { topo: 12, dir: 8, base: 28, esq: 64 };

function escalaLimpa(max: number): number[] {
  if (max <= 0) return [0, 1000];
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((p) => p >= bruto) ?? bruto;
  const topo = Math.ceil(max / passo) * passo;
  return Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
}

export function GraficoMensal({ meses }: { meses: Mes[] }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0); // medido no navegador
  const [foco, setFoco] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.floor(e.contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const max = Math.max(0, ...meses.flatMap((m) => [m.aprovado, m.em_aberto, m.vencido]));
  const ticks = escalaLimpa(max);
  const topo = ticks[ticks.length - 1];
  const areaL = largura - M.esq - M.dir;
  const areaA = ALTURA - M.topo - M.base;
  const banda = areaL / meses.length;
  const barra = Math.min(24, (banda * 0.7 - 4) / 3);
  const grupo = barra * 3 + 4; // 2px de respiro entre barras vizinhas
  const y = (v: number) => M.topo + areaA - (v / topo) * areaA;

  const atual = foco !== null ? meses[foco] : null;

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-tinta-suave">
        {SERIES.map((s) => (
          <li key={s.chave} className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: s.cor }} aria-hidden />
            {s.rotulo}
          </li>
        ))}
      </ul>

      <div ref={caixa} className="relative w-full min-w-0" style={{ height: ALTURA }}>
        {largura > 0 && (
        <svg width={largura} height={ALTURA} role="img" aria-label="Valores por mês: aprovado, em aberto e vencido" className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.esq} x2={largura - M.dir} y1={y(t)} y2={y(t)} stroke="var(--ad-line)" strokeWidth={1} />
              <text x={M.esq - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ad-ink-soft)">
                {moedaCompacta(t)}
              </text>
            </g>
          ))}
          {meses.map((m, i) => {
            const x0 = M.esq + banda * i + (banda - grupo) / 2;
            return (
              <g key={m.mes} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)} onClick={() => setFoco(i)}>
                <rect x={M.esq + banda * i} y={M.topo} width={banda} height={areaA} fill={foco === i ? "var(--ad-bg)" : "transparent"} />
                {SERIES.map((s, k) => {
                  const v = m[s.chave];
                  const h = Math.max(0, y(0) - y(v));
                  const r = Math.min(4, h, barra / 2);
                  const x = x0 + k * (barra + 2);
                  const top = y(0) - h;
                  // topo arredondado (4px), base reta
                  const d = h <= 0 ? "" : `M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + barra - r} Q${x + barra},${top} ${x + barra},${top + r} V${y(0)} Z`;
                  return d ? <path key={s.chave} d={d} fill={s.cor} /> : null;
                })}
                <text x={M.esq + banda * i + banda / 2} y={ALTURA - 8} textAnchor="middle" fontSize={12} fill="var(--ad-ink-soft)">
                  {banda < 56 ? mesCurto(m.mes).slice(0, 3) : mesCurto(m.mes)}
                </text>
              </g>
            );
          })}
          <line x1={M.esq} x2={largura - M.dir} y1={y(0)} y2={y(0)} stroke="var(--ad-ink-soft)" strokeWidth={1} />
        </svg>
        )}

        {atual && foco !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-56 rounded-ad border border-linha bg-superficie p-3 text-sm shadow-ad"
            style={{ left: Math.min(largura - 224, Math.max(0, M.esq + banda * foco + banda / 2 - 112)) }}
          >
            <p className="mb-2 text-tinta">{mesCurto(atual.mes)}</p>
            {SERIES.map((s) => (
              <p key={s.chave} className="numeros flex items-center justify-between gap-3 text-tinta-suave">
                <span className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-sm" style={{ background: s.cor }} />
                  {s.rotulo.split(" (")[0]}
                </span>
                <span className="text-tinta">{moeda(atual[s.chave])}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-4 text-sm">
        <summary className="min-h-12 cursor-pointer py-3 text-tinta-suave">Ver em tabela</summary>
        <div className="overflow-x-auto">
          <table className="numeros w-full text-left">
            <thead className="rotulo">
              <tr>
                <th className="py-2 pr-4 font-normal">Mês</th>
                {SERIES.map((s) => (
                  <th key={s.chave} className="py-2 pr-4 text-right font-normal">
                    {s.rotulo.split(" (")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes} className="border-t border-linha">
                  <td className="py-2 pr-4">{mesCurto(m.mes)}</td>
                  {SERIES.map((s) => (
                    <td key={s.chave} className="py-2 pr-4 text-right">
                      {moeda(m[s.chave])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
