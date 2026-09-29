-- ==========================================================================
-- MUNCHKIN ASSISTANT MULTIPLAYER — SUPABASE DATABASE SCHEMA
-- Execute this SQL script in the Supabase SQL Editor (https://app.supabase.com)
-- ==========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE GAMES TABLE
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'playing',
    max_level INTEGER NOT NULL DEFAULT 10,
    current_player_id UUID,
    turn_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CREATE PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT 'warrior',
    race TEXT NOT NULL DEFAULT 'sin_raza',
    class TEXT NOT NULL DEFAULT 'sin_clase',
    level INTEGER NOT NULL DEFAULT 1,
    gold INTEGER NOT NULL DEFAULT 0,
    strength_bonus INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign Key constraint for current_player_id
ALTER TABLE public.games 
    ADD CONSTRAINT fk_games_current_player 
    FOREIGN KEY (current_player_id) REFERENCES public.players(id) ON DELETE SET NULL;

-- 4. CREATE PLAYER_MODIFIERS TABLE (Items & Potions)
CREATE TABLE IF NOT EXISTS public.player_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bonus INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'equip', -- 'equip' or 'temp'
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CREATE GAME_EVENTS TABLE (Chronological log)
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL DEFAULT 'SYSTEM',
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_timestamp
BEFORE UPDATE ON public.games
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_players_timestamp
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES (Public read and write based on game session, no email signup required)
CREATE POLICY "Allow public read access to games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to games" ON public.games FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to games" ON public.games FOR DELETE USING (true);

CREATE POLICY "Allow public read access to players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to players" ON public.players FOR DELETE USING (true);

CREATE POLICY "Allow public read access to player_modifiers" ON public.player_modifiers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to player_modifiers" ON public.player_modifiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to player_modifiers" ON public.player_modifiers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to player_modifiers" ON public.player_modifiers FOR DELETE USING (true);

CREATE POLICY "Allow public read access to game_events" ON public.game_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to game_events" ON public.game_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to game_events" ON public.game_events FOR DELETE USING (true);

-- 9. ENABLE SUPABASE REALTIME PUBLICATION FOR ALL TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_modifiers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
