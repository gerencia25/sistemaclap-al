-- =========================================================
-- MAESTRO DE PRODUCTOS
-- Código oficial único
--
-- En CLAP V3, products.final_code se define como el código
-- oficial del Maestro de Productos.
--
-- El índice evita códigos duplicados ignorando diferencias
-- de mayúsculas/minúsculas y espacios laterales.
-- =========================================================

create unique index if not exists products_final_code_unique_idx
on public.products (upper(btrim(final_code)))
where final_code is not null
  and btrim(final_code) <> '';
