/** Título editorial do site: texto normal + trecho em itálico bronze. */
export function Titulo({
  children,
  italico,
  sobrancelha,
  className = "",
}: {
  children: React.ReactNode;
  italico?: string;
  sobrancelha?: string;
  className?: string;
}) {
  return (
    <header className={className}>
      {sobrancelha && <p className="sobrancelha mb-2">{sobrancelha}</p>}
      <h1 className="font-display text-4xl leading-tight font-normal sm:text-5xl">
        {children}
        {italico && <em className="text-bronze"> {italico}</em>}
      </h1>
    </header>
  );
}
