import { Button } from '@/components/ui/button';
import type { ShopeeEntry } from '../entry';
import { connectShopee } from '../server/actions';

export function ShopeeAuthorizationForm({
  origin = 'loja-pronta',
  sandbox,
}: {
  origin?: ShopeeEntry;
  sandbox: boolean;
}) {
  return (
    <form action={connectShopee} className="flex flex-col gap-3">
      <input type="hidden" name="origin" value={origin} />
      <p id="shopee-authorization-help" className="text-body text-pretty text-muted-foreground">
        {sandbox
          ? 'Na Shopee, selecione Brasil (BR) e entre com a conta da loja de teste.'
          : 'Na Shopee, selecione Brasil (BR) e entre com a conta de vendedora da loja que você quer conectar.'}
      </p>
      <Button type="submit" aria-describedby="shopee-authorization-help">
        Autorizar na Shopee
      </Button>
    </form>
  );
}
