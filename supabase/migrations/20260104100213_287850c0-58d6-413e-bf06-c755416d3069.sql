-- Create bulk_transfers table to store bulk transfer sessions
CREATE TABLE public.bulk_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  token_symbol text NOT NULL,
  token_address text,
  total_recipients integer NOT NULL,
  successful_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  total_amount text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create bulk_transfer_items table to store individual transfer details
CREATE TABLE public.bulk_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_transfer_id uuid REFERENCES public.bulk_transfers(id) ON DELETE CASCADE NOT NULL,
  recipient_address text NOT NULL,
  amount text NOT NULL,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_transfer_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for bulk_transfers - only admins can access
CREATE POLICY "Admins can manage bulk_transfers"
ON public.bulk_transfers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for bulk_transfer_items - only admins can access
CREATE POLICY "Admins can manage bulk_transfer_items"
ON public.bulk_transfer_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bulk_transfers bt
    WHERE bt.id = bulk_transfer_id
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_bulk_transfers_created_by ON public.bulk_transfers(created_by);
CREATE INDEX idx_bulk_transfers_status ON public.bulk_transfers(status);
CREATE INDEX idx_bulk_transfer_items_bulk_transfer_id ON public.bulk_transfer_items(bulk_transfer_id);
CREATE INDEX idx_bulk_transfer_items_status ON public.bulk_transfer_items(status);