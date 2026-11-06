-- Limit profile visibility to its owner so balances are not publicly readable.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
REVOKE SELECT ON public.profiles FROM anon;

-- Bet history is private to each signed-in account.
DROP POLICY IF EXISTS "Bets are viewable by everyone" ON public.bets;
CREATE POLICY "Users can view own bets"
  ON public.bets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
REVOKE SELECT ON public.bets FROM anon;

-- These routines only update rows the caller can access under RLS; they do not need
-- SECURITY DEFINER privileges. Keep execution for signed-in app users and deny anon/public.
ALTER FUNCTION public.settle_bet(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB) SECURITY INVOKER;
ALTER FUNCTION public.adjust_balance(NUMERIC) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.settle_bet(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.adjust_balance(NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_bet(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_balance(NUMERIC) TO authenticated;