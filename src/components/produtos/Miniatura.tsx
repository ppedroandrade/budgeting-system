/** Foto do produto em caixa quadrada; sem foto mostra a logo bem clara (nunca ícone quebrado). */
export function Miniatura({ url, alt, className = "" }: { url: string | null; alt: string; className?: string }) {
  return (
    <div className={`grid aspect-square place-items-center overflow-hidden bg-white ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/logo-escura-header.png" alt="" className="w-3/5 opacity-10" />
      )}
    </div>
  );
}
