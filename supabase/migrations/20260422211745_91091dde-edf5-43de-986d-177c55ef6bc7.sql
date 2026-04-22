UPDATE public.products
SET active = true,
    updated_at = now()
WHERE active = false;