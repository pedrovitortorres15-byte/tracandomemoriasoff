import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FirebaseProduct {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem?: string;
  imagens?: string[];
  categoria?: string;
  ativo?: boolean;
  estoque?: number;
  [key: string]: unknown;
}

async function fetchAllProducts(): Promise<FirebaseProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true);

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    nome: p.name,
    descricao: p.description || '',
    preco: p.price,
    imagem: p.image_url || '',
    categoria: p.category || '',
    ativo: p.active,
    estoque: p.stock,
  }));
}

export function useProducts() {
  return useQuery({
    queryKey: ['all-products'],
    queryFn: fetchAllProducts,
  });
}
