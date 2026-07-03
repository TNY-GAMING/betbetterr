
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  balance NUMERIC(14,2) NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- BETS
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  wager NUMERIC(14,2) NOT NULL CHECK (wager >= 0),
  payout NUMERIC(14,2) NOT NULL CHECK (payout >= 0),
  multiplier NUMERIC(10,4) NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bets TO authenticated;
GRANT SELECT ON public.bets TO anon;
GRANT ALL ON public.bets TO service_role;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bets are viewable by everyone" ON public.bets FOR SELECT USING (true);
CREATE POLICY "Users insert own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX bets_user_created_idx ON public.bets (user_id, created_at DESC);
CREATE INDEX bets_created_idx ON public.bets (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; final TEXT; n INT := 0;
BEGIN
  base := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username',''),
    NULLIF(split_part(NEW.email,'@',1),''),
    'player'
  );
  base := regexp_replace(lower(base), '[^a-z0-9_]', '', 'g');
  IF length(base) < 3 THEN base := 'player' || substr(NEW.id::text,1,6); END IF;
  final := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final) LOOP
    n := n + 1; final := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, balance) VALUES (NEW.id, final, 1000.00);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- settle_bet: atomic wager + payout in a single transaction
CREATE OR REPLACE FUNCTION public.settle_bet(
  p_game TEXT,
  p_wager NUMERIC,
  p_payout NUMERIC,
  p_multiplier NUMERIC,
  p_outcome TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (new_balance NUMERIC, bet_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID; cur NUMERIC; nb NUMERIC; bid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_wager < 0 OR p_payout < 0 THEN RAISE EXCEPTION 'invalid amounts'; END IF;
  IF p_wager > 1000000 OR p_payout > 100000000 THEN RAISE EXCEPTION 'amount too large'; END IF;

  SELECT balance INTO cur FROM public.profiles WHERE id = uid FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'profile missing'; END IF;
  IF cur < p_wager THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  nb := cur - p_wager + p_payout;
  UPDATE public.profiles SET balance = nb WHERE id = uid;

  INSERT INTO public.bets (user_id, game, wager, payout, multiplier, outcome, meta)
    VALUES (uid, p_game, p_wager, p_payout, p_multiplier, p_outcome, p_meta)
    RETURNING id INTO bid;

  RETURN QUERY SELECT nb, bid;
END; $$;
GRANT EXECUTE ON FUNCTION public.settle_bet(TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,JSONB) TO authenticated;

-- adjust_balance: wallet deposit/withdraw (demo). Only positive deposits from client.
CREATE OR REPLACE FUNCTION public.adjust_balance(p_delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID; cur NUMERIC; nb NUMERIC;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF abs(p_delta) > 100000 THEN RAISE EXCEPTION 'amount too large'; END IF;
  SELECT balance INTO cur FROM public.profiles WHERE id = uid FOR UPDATE;
  nb := cur + p_delta;
  IF nb < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.profiles SET balance = nb WHERE id = uid;
  RETURN nb;
END; $$;
GRANT EXECUTE ON FUNCTION public.adjust_balance(NUMERIC) TO authenticated;
