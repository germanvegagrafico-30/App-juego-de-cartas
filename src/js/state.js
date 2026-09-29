/* ==========================================================================
   STATE MANAGER — CENTRALIZED REALTIME STATE & EVENT DISPATCHER
   ========================================================================== */

import { gameService } from './gameService.js';
import { StorageManager } from './storage.js';

export const AVATARS = [
  { id: 'warrior', icon: '⚔️', label: 'Guerrero Valiente' },
  { id: 'mage', icon: '🪄', label: 'Mago Arcano' },
  { id: 'cleric', icon: '📜', label: 'Clérigo Devoto' },
  { id: 'thief', icon: '🗡️', label: 'Ladrón Astuto' },
  { id: 'dwarf', icon: '🧔', label: 'Enano Barbudo' },
  { id: 'elf', icon: '🧝', label: 'Elfo Agresivo' },
  { id: 'halfling', icon: '🍕', label: 'Mediano Glotón' },
  { id: 'dragon', icon: '🐉', label: 'Dragón de la Calavera' },
  { id: 'duck', icon: '🦆', label: 'Pato del Apocalipsis' },
  { id: 'goblin', icon: '👺', label: 'Goblin Pícaro' },
  { id: 'orc', icon: '👹', label: 'Orco Feroz' },
  { id: 'bard', icon: '🎻', label: 'Bardo Encantador' }
];

export const RACES = {
  sin_raza: { name: 'Sin Raza (Humano)', icon: '🧬' },
  enano: { name: 'Enano', icon: '🧔' },
  elfo: { name: 'Elfo', icon: '🧝' },
  mediano: { name: 'Mediano', icon: '🍕' },
  orc: { name: 'Orco', icon: '👹' },
  gnome: { name: 'Gnomo', icon: '🧙‍♂️' },
  mestizo: { name: 'Mestizo / Multi-Raza', icon: '🧬' }
};

export const CLASSES = {
  sin_clase: { name: 'Sin Clase', icon: '🛡️' },
  guerrero: { name: 'Guerrero', icon: '⚔️' },
  mago: { name: 'Mago', icon: '🪄' },
  clerigo: { name: 'Clérigo', icon: '📜' },
  ladron: { name: 'Ladrón', icon: '🗡️' },
  bard: { name: 'Bardo', icon: '🎻' },
  super_munchkin: { name: 'Super Munchkin', icon: '⭐' }
};

class GameState {
  constructor() {
    this.listeners = [];
    this.myPlayerId = localStorage.getItem('MUNCHKIN_MY_PLAYER_ID') || null;
    
    // Default State Structure
    this.data = {
      sessionId: null,
      gameCode: 'MUNCHKIN-DEMO',
      config: {
        maxLevel: 10,
        soundEnabled: true
      },
      currentTurnPlayerId: null,
      turnCount: 1,
      players: [],
      history: [],
      stats: {
        totalCombatsPlayed: 0,
        totalMonstersDefeated: 0,
        totalEscapesAttempted: 0,
        totalEscapesSuccessful: 0
      }
    };
  }

  async init() {
    const savedSession = StorageManager.loadSession();
    if (savedSession && savedSession.sessionId) {
      this.data = savedSession;
      try {
        await this.syncFromSupabase(savedSession.sessionId);
        this.subscribeRealtime(savedSession.sessionId);
      } catch (e) {
        console.warn('Could not sync saved session from Supabase:', e);
      }
    } else {
      // Default demo players for instant play demonstration if offline
      this.createPlayerLocal({ name: 'Germán', avatar: 'warrior', race: 'sin_raza', class: 'guerrero', level: 1, gold: 0 });
      this.createPlayerLocal({ name: 'Juan', avatar: 'mage', race: 'elfo', class: 'mago', level: 1, gold: 0 });
      if (this.data.players.length > 0) {
        this.data.currentTurnPlayerId = this.data.players[0].id;
        this.myPlayerId = this.data.players[0].id;
      }
      this.addHistoryItem('SYSTEM', null, '🎮 Partida demo local. Hacé clic en "Partida" para crear o unirte a una partida multijugador.');
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    StorageManager.saveSession(this.data);
    this.listeners.forEach(fn => fn(this.data));
  }

  setConnectionStatus(status) {
    const badge = document.getElementById('connectionBadge');
    if (!badge) return;

    badge.classList.remove('badge-connected', 'badge-disconnected', 'badge-connecting');
    if (status === 'connected') {
      badge.classList.add('badge-connected');
      badge.textContent = '🟢 CONECTADO';
    } else if (status === 'connecting') {
      badge.classList.add('badge-connecting');
      badge.textContent = '🟡 CONECTANDO...';
    } else {
      badge.classList.add('badge-disconnected');
      badge.textContent = '🔴 SIN CONEXIÓN';
    }
  }

  /* ==========================================================================
     CREAR & UNIRSE A PARTIDAS MULTIJUGADOR
     ========================================================================== */

  async createNewGame({ playerName, maxLevel = 10, avatar = 'warrior' }) {
    const result = await gameService.createGame({ playerName, maxLevel, avatar });
    this.myPlayerId = result.player.id;
    localStorage.setItem('MUNCHKIN_MY_PLAYER_ID', this.myPlayerId);

    this.data.sessionId = result.game.id;
    this.data.gameCode = result.game.code;
    this.data.config.maxLevel = result.game.max_level || maxLevel;

    await this.syncFromSupabase(result.game.id);
    this.subscribeRealtime(result.game.id);
    this.notify();
  }

  async joinExistingGame({ gameCode, playerName, avatar = 'warrior' }) {
    const result = await gameService.joinGame({ gameCode, playerName, avatar });
    this.myPlayerId = result.player.id;
    localStorage.setItem('MUNCHKIN_MY_PLAYER_ID', this.myPlayerId);

    this.data.sessionId = result.game.id;
    this.data.gameCode = result.game.code;
    this.data.config.maxLevel = result.game.max_level || 10;

    await this.syncFromSupabase(result.game.id);
    this.subscribeRealtime(result.game.id);
    this.notify();
  }

  async syncFromSupabase(gameId) {
    const fullData = await gameService.fetchFullGameData(gameId);
    if (fullData) {
      this.data = {
        ...this.data,
        ...fullData
      };
      this.notify();
    }
  }

  subscribeRealtime(gameId) {
    gameService.subscribeToGame(
      gameId,
      () => this.syncFromSupabase(gameId),
      (status) => this.setConnectionStatus(status)
    );
  }

  /* ==========================================================================
     PLAYER MANAGEMENT & LOCAL CREATION
     ========================================================================== */

  createPlayerLocal({ name, avatar = 'warrior', race = 'sin_raza', class: className = 'sin_clase', level = 1, gold = 0 }) {
    const id = 'p_' + Math.random().toString(36).substr(2, 9);
    const newPlayer = {
      id,
      name: name.trim(),
      avatar,
      race,
      class: className,
      level: parseInt(level, 10) || 1,
      gold: parseInt(gold, 10) || 0,
      modifiers: [],
      stats: { levelsGained: 0, levelsLost: 0, monstersDefeated: 0, combatsLost: 0, escapeAttempts: 0, escapesSuccessful: 0, goldEarned: parseInt(gold, 10) || 0 }
    };
    this.data.players.push(newPlayer);
    return newPlayer;
  }

  async createPlayer({ name, avatar = 'warrior', race = 'sin_raza', class: className = 'sin_clase', level = 1, gold = 0 }) {
    if (this.data.sessionId) {
      await gameService.joinGame({ gameCode: this.data.gameCode, playerName: name, avatar });
      await this.syncFromSupabase(this.data.sessionId);
    } else {
      const p = this.createPlayerLocal({ name, avatar, race, class: className, level, gold });
      this.notify();
      return p;
    }
  }

  async updatePlayer(id, fields) {
    const player = this.getPlayerById(id);
    if (!player) return;

    if (fields.name !== undefined) player.name = fields.name.trim();
    if (fields.avatar !== undefined) player.avatar = fields.avatar;
    if (fields.race !== undefined) player.race = fields.race;
    if (fields.class !== undefined) player.class = fields.class;

    this.notify();

    if (this.data.sessionId) {
      await gameService.updatePlayerDetails(this.data.sessionId, player, fields);
    }
  }

  async deletePlayer(id) {
    const player = this.getPlayerById(id);
    if (!player) return;

    const index = this.data.players.findIndex(p => p.id === id);
    if (index !== -1) this.data.players.splice(index, 1);

    if (this.data.currentTurnPlayerId === id) {
      this.data.currentTurnPlayerId = this.data.players[0]?.id || null;
    }

    this.notify();

    if (this.data.sessionId) {
      await gameService.deletePlayer(this.data.sessionId, player);
    }
  }

  getPlayerById(id) {
    return this.data.players.find(p => p.id === id) || null;
  }

  calculatePlayerStrength(player) {
    if (!player) return 0;
    const baseLevel = player.level || 1;
    const itemsBonus = (player.modifiers || []).reduce((acc, item) => {
      const bonusVal = item.bonus !== undefined ? item.bonus : item.value;
      return acc + (item.active !== false ? (parseInt(bonusVal, 10) || 0) : 0);
    }, 0);
    return baseLevel + itemsBonus;
  }

  /* ==========================================================================
     LEVEL & GOLD MODIFIERS
     ========================================================================== */

  async modifyLevel(playerId, delta, isManual = false) {
    const player = this.getPlayerById(playerId);
    if (!player) return;

    const oldLevel = player.level;
    let newLevel = oldLevel + delta;

    if (newLevel < 1) newLevel = 1;

    const maxLevel = this.data.config.maxLevel || 10;
    let isVictory = false;

    if (newLevel >= maxLevel) {
      newLevel = maxLevel;
      isVictory = true;
    }

    player.level = newLevel;
    const diff = newLevel - oldLevel;
    if (diff > 0) player.stats.levelsGained += diff;
    else if (diff < 0) player.stats.levelsLost += Math.abs(diff);

    this.notify();

    if (this.data.sessionId) {
      await gameService.updatePlayerLevel(this.data.sessionId, player, newLevel, diff);
    }

    if (isVictory) {
      this.triggerVictory(player);
    }
  }

  async setLevelDirect(playerId, level) {
    const player = this.getPlayerById(playerId);
    if (!player) return;
    const oldLevel = player.level;
    const targetLevel = Math.max(1, parseInt(level, 10) || 1);
    await this.modifyLevel(playerId, targetLevel - oldLevel, true);
  }

  async modifyGold(playerId, delta) {
    const player = this.getPlayerById(playerId);
    if (!player) return;

    const oldGold = player.gold;
    let newGold = oldGold + delta;
    if (newGold < 0) newGold = 0;

    player.gold = newGold;
    if (delta > 0) player.stats.goldEarned += delta;

    this.notify();

    if (this.data.sessionId) {
      await gameService.updatePlayerGold(this.data.sessionId, player, newGold, delta);
    }
  }

  async sellGoldForLevels(playerId, goldAmount) {
    const player = this.getPlayerById(playerId);
    if (!player) return false;

    if (player.gold < goldAmount) return false;

    const levelsToAdd = Math.floor(goldAmount / 1000);
    if (levelsToAdd <= 0) return false;

    const maxLevel = this.data.config.maxLevel || 10;
    if (player.level + levelsToAdd >= maxLevel) {
      alert(`⚠️ Regla Munchkin: No podés comprar el nivel de victoria final (${maxLevel}) con oro. Debés ganarlo en combate.`);
      return false;
    }

    player.gold -= goldAmount;
    await this.modifyGold(playerId, -goldAmount);
    await this.modifyLevel(playerId, levelsToAdd);
    return true;
  }

  /* ==========================================================================
     ITEM MODIFIERS MANAGEMENT
     ========================================================================== */

  async addModifier(playerId, { name, value, type = 'equip' }) {
    const player = this.getPlayerById(playerId);
    if (!player) return;

    const mod = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      bonus: parseInt(value, 10) || 0,
      value: parseInt(value, 10) || 0,
      type,
      active: true
    };

    player.modifiers.push(mod);
    this.notify();

    if (this.data.sessionId) {
      await gameService.addModifier(this.data.sessionId, playerId, { name, value, type });
    }
  }

  async toggleModifier(playerId, modId) {
    const player = this.getPlayerById(playerId);
    if (!player) return;
    const mod = player.modifiers.find(m => m.id === modId);
    if (mod) {
      mod.active = !mod.active;
      this.notify();
      if (this.data.sessionId) {
        await gameService.toggleModifier(modId, mod.active);
      }
    }
  }

  async removeModifier(playerId, modId) {
    const player = this.getPlayerById(playerId);
    if (!player) return;
    const index = player.modifiers.findIndex(m => m.id === modId);
    if (index !== -1) {
      player.modifiers.splice(index, 1);
      this.notify();
      if (this.data.sessionId) {
        await gameService.deleteModifier(modId);
      }
    }
  }

  /* ==========================================================================
     TURN MANAGEMENT
     ========================================================================== */

  async nextTurn() {
    if (this.data.players.length === 0) return;

    const currentIndex = this.data.players.findIndex(p => p.id === this.data.currentTurnPlayerId);
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % this.data.players.length;
    }

    const nextPlayer = this.data.players[nextIndex];
    this.data.currentTurnPlayerId = nextPlayer.id;
    this.data.turnCount++;

    this.notify();

    if (this.data.sessionId) {
      await gameService.nextTurn(this.data.sessionId, nextPlayer.id, this.data.turnCount);
      await gameService.logEvent(this.data.sessionId, nextPlayer.id, 'TURN', `🔄 Turno de ${nextPlayer.name} (Ronda #${this.data.turnCount}).`);
    }
  }

  /* ==========================================================================
     HISTORY & STATS
     ========================================================================== */

  addHistoryItem(type, playerName, description) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const item = {
      id: 'h_' + Math.random().toString(36).substr(2, 9),
      timestamp: timeStr,
      playerName: playerName || 'Sistema',
      type,
      description
    };

    this.data.history.unshift(item);
    if (this.data.history.length > 200) this.data.history.pop();
  }

  clearHistory() {
    this.data.history = [];
    this.notify();
  }

  triggerVictory(player) {
    if (window.onMunchkinVictory) {
      window.onMunchkinVictory(player);
    }
  }

  resetGame() {
    this.data.players = [];
    this.data.history = [];
    this.data.currentTurnPlayerId = null;
    this.data.turnCount = 1;
    this.data.sessionId = null;
    StorageManager.clearSession();
    this.notify();
  }

  loadStateData(newData) {
    if (newData && newData.players) {
      this.data = newData;
      this.notify();
    }
  }
}

export const state = new GameState();
