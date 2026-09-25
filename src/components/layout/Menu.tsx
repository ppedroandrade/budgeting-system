"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { itemAtivo, type ItemMenu } from "./menu";
import { sair } from "@/app/login/actions";

function Links({ itens, ativo, aoNavegar }: { itens: ItemMenu[]; ativo?: string; aoNavegar?: () => void }) {
  return (
    <ul className="space-y-1">
      {itens.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            onClick={aoNavegar}
            aria-current={ativo === i.href ? "page" : undefined}
            className={`flex min-h-12 items-center border-l-2 px-4 text-[0.8125rem] tracking-[0.18em] uppercase transition-colors ${
              ativo === i.href
                ? "border-bronze text-tinta"
                : "border-transparent text-tinta-suave hover:text-tinta"
            }`}
          >
            {i.rotulo}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Rodape({ nome, perfil }: { nome: string; perfil: string }) {
  return (
    <div className="border-t border-linha px-4 pt-5">
      <p className="text-sm text-tinta">{nome}</p>
      <p className="rotulo mt-0.5">{perfil === "admin" ? "Administrador" : "Vendedor"}</p>
      <form action={sair}>
        <button className="mt-3 min-h-12 text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline">
          Sair
        </button>
      </form>
    </div>
  );
}

export function Menu({ itens, nome, perfil }: { itens: ItemMenu[]; nome: string; perfil: string }) {
  const caminho = usePathname();
  const ativo = itemAtivo(itens, caminho);
  const [aberto, setAberto] = useState(false);

  const logo = (
    <Link href="/" aria-label="Início">
      <Image src="/brand/logo-escura-header.png" alt="Arte Decor Revest" width={225} height={48} className="h-auto w-40" priority />
    </Link>
  );

  return (
    <>
      {/* Computador: barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between border-r border-linha bg-superficie py-8 lg:flex">
        <div>
          <div className="mb-12 px-4">{logo}</div>
          <nav aria-label="Menu principal">
            <Links itens={itens} ativo={ativo} />
          </nav>
        </div>
        <Rodape nome={nome} perfil={perfil} />
      </aside>

      {/* Celular/tablet: barra no topo + menu que abre por cima */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-linha bg-superficie px-4 lg:hidden">
        {logo}
        <button
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-celular"
          className="min-h-12 px-3 text-[0.8125rem] tracking-[0.18em] uppercase"
        >
          {aberto ? "Fechar" : "Menu"}
        </button>
      </header>
      {aberto && (
        <div id="menu-celular" className="fixed inset-x-0 top-16 bottom-0 z-30 flex flex-col justify-between overflow-y-auto bg-superficie py-6 lg:hidden">
          <nav aria-label="Menu principal">
            <Links itens={itens} ativo={ativo} aoNavegar={() => setAberto(false)} />
          </nav>
          <Rodape nome={nome} perfil={perfil} />
        </div>
      )}
    </>
  );
}
