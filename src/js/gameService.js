/* ==========================================================================
   GAME SERVICE — SUPABASE REALTIME MULTIPLAYER SERVICE
   ========================================================================== */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

class GameService {
  constructor() {
    this.activeChannel = null;
    this.connectionState = 'disconnected'; // 'connected' | 'connecting' | 'disconnected'
  }

  generateGameCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'MUNCHKIN-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /* ==========================================================================
     CREATE & JOIN GAME
     ========================================================================== */

  async createGame({ playerName, maxLevel = 10, avatar = 'warrior' }) {
    if (!isSupabaseConfigured) {
      return this.createGameLocalFallback({ playerName, maxLevel, avatar });
    }

    const code = this.generateGameCode();

    // 1. Create Game row
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert([{ code, max_level: maxLevel, turn_count: 1 }])
      .select()
      .single();

    if (gameErr) {
      console.error('Error in createGame insert:', gameErr);
      throw new Error(`Error al crear la partida en base de datos: ${gameErr.message}`);
    }

    // 2. Create Player row
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert([{
        game_id: game.id,
        name: playerName.trim(),
        avatar,
        race: 'sin_raza',
        class: 'sin_clase',
        level: 1,
        gold: 0
      }])
      .select()
      .single();

    if (playerErr) {
      console.error('Error in createGame player insert:', playerErr);
      throw new Error(`Error al crear el jugador: ${playerErr.message}`);
    }

    // 3. Set current_player_id on Game
    await supabase
      .from('games')
      .update({ current_player_id: player.id })
      .eq('id', game.id);

    // 4. Log initial event
    await this.logEvent(game.id, player.id, 'SYSTEM', `🎮 ${player.name} creó la partida ${code}.`);

    return { game: { ...game, current_player_id: player.id }, player };
  }

  async joinGame({ gameCode, playerName, avatar = 'warrior' }) {
    if (!isSupabaseConfigured) {
      return this.joinGameLocalFallback({ gameCode, playerName, avatar });
    }

    const cleanCode = gameCode.trim().toUpperCase();

    // 1. Fetch Game by Code
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (gameErr || !game) {
      throw new Error(`No se encontró ninguna partida con el código "${cleanCode}". Verificá e intentá de nuevo.`);
    }

    // 2. Check if player with exact name already exists in this game (rejoining)
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', game.id)
      .eq('name', playerName.trim());

    let player;
    if (existingPlayers && existingPlayers.length > 0) {
      player = existingPlayers[0];
    } else {
      // Create new Player row
      const { data: newPlayer, error: playerErr } = await supabase
        .from('players')
        .insert([{
          game_id: game.id,
          name: playerName.trim(),
          avatar,
          race: 'sin_raza',
          class: 'sin_clase',
          level: 1,
          gold: 0
        }])
        .select()
        .single();

      if (playerErr) throw new Error(`Error al unirse a la partida: ${playerErr.message}`);
      player = newPlayer;

      // Log join event
      await this.logEvent(game.id, player.id, 'SYSTEM', `👥 ${player.name} se unió a la partida.`);
    }

    // If game has no current_player_id, assign this player
    if (!game.current_player_id) {
      await supabase
        .from('games')
        .update({ current_player_id: player.id })
        .eq('id', game.id);
      game.current_player_id = player.id;
    }

    return { game, player };
  }

  /* ==========================================================================
     FETCH FULL GAME DATA
     ========================================================================== */

  async fetchFullGameData(gameId) {
    if (!isSupabaseConfigured) return null;

    const { data: game, error: gameErr } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (gameErr || !game) return null;

    const { data: players } = await supabase.from('players').select('*').eq('game_id', gameId).order('created_at', { ascending: true });
    
    // Fetch modifiers for all players
    const playerIds = (players || []).map(p => p.id);
    let modifiers = [];
    if (playerIds.length > 0) {
      const { data: mods } = await supabase.from('player_modifiers').select('*').in('player_id', playerIds);
      modifiers = mods || [];
    }

    // Attach modifiers to players
    const fullPlayers = (players || []).map(p => ({
      ...p,
      modifiers: modifiers.filter(m => m.player_id === p.id),
      stats: {
        levelsGained: 0,
        levelsLost: 0,
        monstersDefeated: 0,
        combatsLost: 0,
        escapeAttempts: 0,
        escapesSuccessful: 0,
        goldEarned: p.gold || 0
      }
    }));

    const { data: events } = await supabase
      .from('game_events')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(100);

    return {
      sessionId: game.id,
      gameCode: game.code,
      config: {
        maxLevel: game.max_level,
        soundEnabled: true
      },
      currentTurnPlayerId: game.current_player_id,
      turnCount: game.turn_count,
      players: fullPlayers,
      history: (events || []).map(e => ({
        id: e.id,
        timestamp: new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        playerName: fullPlayers.find(p => p.id === e.player_id)?.name || 'Sistema',
        type: e.event_type,
        description: e.description
      }))
    };
  }

  /* ==========================================================================
     REALTIME SUBSCRIPTION HANDLER
     ========================================================================== */

  subscribeToGame(gameId, onDataChanged, onStatusChanged) {
    if (!isSupabaseConfigured) return null;

    if (this.activeChannel) {
      try {
        supabase.removeChannel(this.activeChannel);
      } catch (e) {
        console.warn('Error removing channel:', e);
      }
    }

    if (onStatusChanged) onStatusChanged('connecting');

    const channel = supabase.channel(`game_room_${gameId}`);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => onDataChanged()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => onDataChanged()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_modifiers' },
        () => onDataChanged()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` },
        () => onDataChanged()
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.connectionState = 'connected';
          if (onStatusChanged) onStatusChanged('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.connectionState = 'disconnected';
          if (onStatusChanged) onStatusChanged('disconnected');
          if (err) console.warn('Supabase Realtime Channel notice:', err);
        }
      });

    this.activeChannel = channel;
    return channel;
  }

  /* ==========================================================================
     MUTATIONS (MODIFIERS, LEVEL, GOLD, TURN)
     ========================================================================== */

  async updatePlayerLevel(gameId, player, newLevel, delta) {
    if (!isSupabaseConfigured) return;

    await supabase.from('players').update({ level: newLevel }).eq('id', player.id);

    const desc = delta > 0 
      ? `⭐ ${player.name} subió a Nivel ${newLevel}!` 
      : `📉 ${player.name} bajó a Nivel ${newLevel}.`;
    
    await this.logEvent(gameId, player.id, 'LEVEL', desc);
  }

  async updatePlayerGold(gameId, player, newGold, delta) {
    if (!isSupabaseConfigured) return;

    await supabase.from('players').update({ gold: newGold }).eq('id', player.id);

    const desc = delta > 0 
      ? `🪙 ${player.name} ganó ${delta.toLocaleString('es-AR')} de oro. (Total: ${newGold.toLocaleString('es-AR')})`
      : `🪙 ${player.name} gastó/perdió ${Math.abs(delta).toLocaleString('es-AR')} de oro. (Total: ${newGold.toLocaleString('es-AR')})`;

    await this.logEvent(gameId, player.id, 'GOLD', desc);
  }

  async updatePlayerDetails(gameId, player, fields) {
    if (!isSupabaseConfigured) return;

    await supabase.from('players').update(fields).eq('id', player.id);
  }

  async deletePlayer(gameId, player) {
    if (!isSupabaseConfigured) return;

    await supabase.from('players').delete().eq('id', player.id);
    await this.logEvent(gameId, player.id, 'SYSTEM', `🗑️ ${player.name} fue eliminado de la partida.`);
  }

  async addModifier(gameId, playerId, { name, value, type }) {
    if (!isSupabaseConfigured) return;

    await supabase.from('player_modifiers').insert([{
      player_id: playerId,
      name,
      bonus: value,
      type,
      active: true
    }]);
  }

  async toggleModifier(modId, activeState) {
    if (!isSupabaseConfigured) return;

    await supabase.from('player_modifiers').update({ active: activeState }).eq('id', modId);
  }

  async deleteModifier(modId) {
    if (!isSupabaseConfigured) return;

    await supabase.from('player_modifiers').delete().eq('id', modId);
  }

  async nextTurn(gameId, nextPlayerId, newTurnCount) {
    if (!isSupabaseConfigured) return;

    await supabase.from('games').update({
      current_player_id: nextPlayerId,
      turn_count: newTurnCount
    }).eq('id', gameId);
  }

  async logEvent(gameId, playerId, eventType, description) {
    if (!isSupabaseConfigured) return;

    await supabase.from('game_events').insert([{
      game_id: gameId,
      player_id: playerId,
      event_type: eventType,
      description
    }]);
  }

  /* ==========================================================================
     LOCAL FALLBACK IMPLEMENTATION
     ========================================================================== */

  createGameLocalFallback({ playerName, maxLevel, avatar }) {
    const code = this.generateGameCode();
    const player = {
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      name: playerName.trim(),
      avatar,
      race: 'sin_raza',
      class: 'sin_clase',
      level: 1,
      gold: 0,
      modifiers: [],
      stats: { levelsGained: 0, levelsLost: 0, monstersDefeated: 0, combatsLost: 0, escapeAttempts: 0, escapesSuccessful: 0, goldEarned: 0 }
    };
    const game = {
      id: 'g_' + Math.random().toString(36).substr(2, 9),
      code,
      max_level: maxLevel,
      current_player_id: player.id,
      turn_count: 1
    };
    return { game, player };
  }

  joinGameLocalFallback({ gameCode, playerName, avatar }) {
    const player = {
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      name: playerName.trim(),
      avatar,
      race: 'sin_raza',
      class: 'sin_clase',
      level: 1,
      gold: 0,
      modifiers: [],
      stats: { levelsGained: 0, levelsLost: 0, monstersDefeated: 0, combatsLost: 0, escapeAttempts: 0, escapesSuccessful: 0, goldEarned: 0 }
    };
    const game = {
      id: 'g_' + Math.random().toString(36).substr(2, 9),
      code: gameCode.toUpperCase(),
      max_level: 10,
      current_player_id: player.id,
      turn_count: 1
    };
    return { game, player };
  }
}

export const gameService = new GameService();
