/** The same illustrative packaging composition used in the student's logo studio. */
export function BrandKitPreview({ logoSrc }: { logoSrc: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/kit-envio-kraft.webp"
        alt=""
        width={1536}
        height={1024}
        className="absolute inset-0 size-full object-contain"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        width={1024}
        height={1024}
        className="absolute top-[68%] left-[30%] h-[10%] w-[24%] object-contain opacity-90 mix-blend-multiply"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        width={1024}
        height={1024}
        className="absolute top-[79%] left-[54%] h-[9%] w-[14%] rounded-full object-contain"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        width={1024}
        height={1024}
        className="absolute top-[42%] left-[56.5%] h-[18%] w-[22%] object-contain opacity-90 mix-blend-multiply"
      />
    </div>
  );
}
