-- Agregar columnas para número de transferencia y voucher
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS numero_transferencia TEXT;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS numero_voucher TEXT;

-- Agregar comentarios
COMMENT ON COLUMN consultas.numero_transferencia IS 'Número de referencia de la transferencia bancaria';
COMMENT ON COLUMN consultas.numero_voucher IS 'Número de voucher/baucher del pago con tarjeta';
