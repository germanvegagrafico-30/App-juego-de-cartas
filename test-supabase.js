import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvbatyeigdfbtweqmzfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JhBzW2qk7jXJDl--pbFDvQ_RLbrOWnh';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFullCreateFlow() {
  try {
    const code = 'MUNCHKIN-' + Math.floor(Math.random() * 1000);
    console.log('1. Creating game:', code);

    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert([{ code, max_level: 10, turn_count: 1 }])
      .select()
      .single();

    if (gameErr) throw new Error(`Game insert error: ${JSON.stringify(gameErr)}`);
    console.log('Game created:', game.id);

    console.log('2. Creating player');
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert([{
        game_id: game.id,
        name: 'Germán',
        avatar: 'warrior',
        race: 'sin_raza',
        class: 'sin_clase',
        level: 1,
        gold: 0
      }])
      .select()
      .single();

    if (playerErr) throw new Error(`Player insert error: ${JSON.stringify(playerErr)}`);
    console.log('Player created:', player.id);

    console.log('3. Updating game current_player_id');
    const { error: updateErr } = await supabase
      .from('games')
      .update({ current_player_id: player.id })
      .eq('id', game.id);

    if (updateErr) throw new Error(`Game update error: ${JSON.stringify(updateErr)}`);
    console.log('Game updated with current_player_id');

    console.log('4. Logging event');
    const { error: logErr } = await supabase
      .from('game_events')
      .insert([{
        game_id: game.id,
        player_id: player.id,
        event_type: 'SYSTEM',
        description: `🎮 Germán creó la partida ${code}.`
      }]);

    if (logErr) throw new Error(`Event log error: ${JSON.stringify(logErr)}`);
    console.log('Event logged');

    console.log('🎉 Full flow succeeded!');
  } catch (e) {
    console.error('❌ FLOW FAILED:', e.message);
  }
}

testFullCreateFlow();
