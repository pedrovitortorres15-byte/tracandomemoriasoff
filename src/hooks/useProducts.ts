import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem?: string;
  imagens?: string[];
  videoUrl?: string;
  categoria?: string;
  ativo?: boolean;
  estoque?: number;
  [key: string]: unknown;
}

export type FirebaseProduct = Product;

const normalizeSearchText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,price,image_url,media_urls,video_url,category,active,stock,campaign_slug,created_at')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || [])
    .filter((p: any) => (p.name || '').trim().length > 0)
    .map((p: any) => ({
    id: p.id,
    nome: p.name,
    descricao: p.description || '',
    preco: Number(p.price),
    imagem: (p.media_urls && p.media_urls[0]) || p.image_url || '',
    imagens: p.media_urls && p.media_urls.length > 0 ? p.media_urls : (p.image_url ? [p.image_url] : []),
    videoUrl: p.video_url || '',
    categoria: p.category || '',
    ativo: p.active,
    estoque: p.stock,
    searchText: normalizeSearchText(`${p.name || ''} ${p.description || ''} ${p.category || ''}`),
    campaign_slug: p.campaign_slug || null,
  }));
}

export function useProducts() {
  return useQuery({
    queryKey: ['all-products'],
    queryFn: fetchAllProducts,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}
