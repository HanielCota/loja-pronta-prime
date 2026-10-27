import Image from 'next/image';
import { recoveredProductImages } from '../catalog-import';
import type { RestoredProduct } from '../recovery';

export function RecoveredProductPhotos({ product }: { product: RestoredProduct }) {
  const images = recoveredProductImages(product);
  return images.length ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.slice(0, 9).map((image, index) => (
        <Image
          key={image.key}
          src={`/loja-pronta/produtos/recovered/${product.legacyProductId}/images/${index}`}
          alt={`${product.title} · foto ${index + 1}`}
          width={240}
          height={240}
          unoptimized
          className="aspect-square w-full rounded-2xl bg-muted object-contain"
        />
      ))}
    </div>
  ) : null;
}

export function RecoveredProductVariations({ product }: { product: RestoredProduct }) {
  if (!product.variants.length)
    return <p className="text-body text-muted-foreground">Produto sem variações.</p>;
  const images = recoveredProductImages(product);
  return (
    <details className="rounded-2xl bg-muted p-5">
      <summary className="text-body font-semibold">
        Ver variações ({product.variants.length})
      </summary>
      <div className="mt-4 flex flex-col gap-5">
        {product.axes.map((axis) => (
          <div key={axis.name}>
            <h3 className="text-body font-semibold">{axis.name}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {axis.options.map((option) => (
                <li key={option.label} className="flex items-center gap-3 text-body">
                  {option.image ? (
                    <Image
                      src={`/loja-pronta/produtos/recovered/${product.legacyProductId}/images/${images.findIndex((image) => image.key === option.image?.key)}`}
                      alt={`Opção ${option.label}`}
                      width={72}
                      height={72}
                      unoptimized
                      className="rounded-2xl bg-card object-contain"
                    />
                  ) : null}
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-body font-semibold">Combinações recuperadas</h3>
          <ul className="mt-2 list-inside list-disc space-y-2 text-body">
            {product.variants.map((variant) => (
              <li key={variant.sku}>{Object.values(variant.options).join(' / ')}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
