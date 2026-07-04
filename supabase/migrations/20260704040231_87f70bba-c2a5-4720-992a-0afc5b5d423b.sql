
-- 1) Add profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2) Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('deposit','withdraw')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL,
  method TEXT NOT NULL DEFAULT 'demo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS transactions_user_created_idx
  ON public.transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bets_user_created_idx
  ON public.bets (user_id, created_at DESC);

-- 3) Replace adjust_balance to also log a transaction row atomically
CREATE OR REPLACE FUNCTION public.adjust_balance(p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID; cur NUMERIC; nb NUMERIC; kind TEXT;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_delta = 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF abs(p_delta) > 100000 THEN RAISE EXCEPTION 'amount too large'; END IF;
  SELECT balance INTO cur FROM public.profiles WHERE id = uid FOR UPDATE;
  nb := cur + p_delta;
  IF nb < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.profiles SET balance = nb WHERE id = uid;
  kind := CASE WHEN p_delta > 0 THEN 'deposit' ELSE 'withdraw' END;
  INSERT INTO public.transactions (user_id, kind, amount, balance_after, method)
    VALUES (uid, kind, abs(p_delta), nb, 'demo');
  RETURN nb;
END; $$;
