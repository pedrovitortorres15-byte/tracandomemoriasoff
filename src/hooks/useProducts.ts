import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY, type ShopifyProduct } from '@/lib/shopify';

export function useProducts(first = 20) {
  return useQuery({
    queryKey: ['shopify-products', first],
    queryFn: async (): Promise<ShopifyProduct[]> => {
      const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first });
      return data?.data?.products?.edges || [];
    },
  });
}
