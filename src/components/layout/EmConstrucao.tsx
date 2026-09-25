import { Titulo } from "@/components/ui/Titulo";

export function EmConstrucao({ titulo, italico, fase }: { titulo: string; italico: string; fase: string }) {
  return (
    <>
      <Titulo italico={italico}>{titulo}</Titulo>
      <p className="mt-6 max-w-prose text-tinta-suave">Esta tela chega na {fase}.</p>
    </>
  );
}
