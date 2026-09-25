import Image from "next/image";
import { FormLogin } from "./FormLogin";
import { Titulo } from "@/components/ui/Titulo";

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams;
  const aviso = motivo === "inativo" ? "Seu acesso está desativado. Fale com o administrador." : undefined;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Image src="/brand/logo-escura-header.png" alt="Arte Decor Revest" width={225} height={48} priority className="mx-auto mb-12 h-auto w-56" />
        <Titulo sobrancelha="Orçamentos" italico="de volta." className="mb-8 text-center">
          Bem-vindo
        </Titulo>
        <div className="rounded-ad border border-linha bg-superficie p-6 shadow-ad sm:p-8">
          <FormLogin avisoInicial={aviso} />
        </div>
        <p className="mt-8 text-center text-sm text-tinta-suave">Esqueceu a senha? Fale com o administrador.</p>
      </div>
    </main>
  );
}
