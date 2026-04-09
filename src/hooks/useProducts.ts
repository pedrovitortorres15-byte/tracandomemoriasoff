import { useQuery } from '@tanstack/react-query';
import { fetchProducts, type FirebaseProduct } from '@/lib/firebase';

export function useProducts() {
  return useQuery({
    queryKey: ['firebase-products'],
    queryFn: fetchProducts,
  });
}

export type { FirebaseProduct };
