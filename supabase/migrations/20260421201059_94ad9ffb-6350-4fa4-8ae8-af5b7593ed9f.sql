CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  real_price numeric;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'product_id é obrigatório em order_items';
  END IF;

  SELECT price INTO real_price
  FROM public.products
  WHERE id = NEW.product_id AND active = true;

  IF real_price IS NULL THEN
    RAISE EXCEPTION 'Produto inválido ou inativo (%).', NEW.product_id;
  END IF;

  -- Produtos personalizados podem ter adicionais no carrinho.
  -- Bloqueia somente preço menor que o preço base cadastrado ou valores absurdos.
  IF NEW.unit_price < real_price THEN
    RAISE EXCEPTION 'unit_price (%) não pode ser menor que o preço base do produto (%).', NEW.unit_price, real_price;
  END IF;

  IF NEW.unit_price > 100000 THEN
    RAISE EXCEPTION 'unit_price (%) fora do limite permitido.', NEW.unit_price;
  END IF;

  IF NEW.quantity <= 0 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'Quantidade fora do permitido (1-100).';
  END IF;

  RETURN NEW;
END;
$function$;