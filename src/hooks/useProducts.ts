import { useQuery } from '@tanstack/react-query';
import { fetchProducts, type FirebaseProduct } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

async function fetchAllProducts(): Promise<FirebaseProduct[]> {
  // Fetch from both sources in parallel
  const [firebaseProducts, { data: supabaseProducts }] = await Promise.all([
    fetchProducts(),
    supabase.from('products').select('*').eq('active', true),
  ]);

  // Map Supabase products to the same shape
  const mapped: FirebaseProduct[] = (supabaseProducts || []).map((p) => ({
    id: p.id,
    nome: p.name,
    descricao: p.description || '',
    preco: p.price,
    imagem: p.image_url || '',
    categoria: p.category || '',
    ativo: p.active,
    estoque: p.stock,
  }));

  return [...firebaseProducts, ...mapped];
}

export function useProducts() {
  return useQuery({
    queryKey: ['all-products'],
    queryFn: fetchAllProducts,
  });
}

export type { FirebaseProduct };
