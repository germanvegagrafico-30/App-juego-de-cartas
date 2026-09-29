/* ==========================================================================
   COMPONENT — PLAYER CARD RENDERER & INTERACTION HANDLERS
   ========================================================================== */

import { state, AVATARS, RACES, CLASSES } from '../state.js';
import { Sound } from '../audio.js';

export function renderPlayerCards(containerEl) {
  if (!containerEl) return;
  const players = state.data.players;
  const emptyState = document.getElementById('emptyPlayersState');
  
  if (players.length === 0) {
    containerEl.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');

  containerEl.innerHTML = players.map(player => {
    const isCurrentTurn = state.data.currentTurnPlayerId === player.id;
    const isMyCard = state.myPlayerId === player.id;

    const avatarObj = AVATARS.find(a => a.id === player.avatar) || AVATARS[0];
    const totalStrength = state.calculatePlayerStrength(player);
    const activeItemsCount = (player.modifiers || []).filter(m => m.active !== false).length;

    const raceObj = RACES[player.race] || RACES.sin_raza;
    const classObj = CLASSES[player.class] || CLASSES.sin_clase;

    return `
      <div class="munchkin-card ${isCurrentTurn ? 'is-active-turn' : ''}" data-player-id="${player.id}">
        
        <!-- CARD HEADER -->
        <div class="card-header-bar">
          <div class="card-avatar" title="${avatarObj.label}">
            ${avatarObj.icon}
          </div>
          <div class="card-player-info">
            <div class="card-player-name" title="${player.name}">
              ${player.name}
              ${isMyCard ? '<span class="badge-tag badge-you" style="background: var(--gold-main); color: #000; font-weight: 800; margin-left: 6px;">👑 TÚ</span>' : ''}
            </div>
            <div class="card-badges-row">
              <span class="badge-tag">${raceObj.icon} ${raceObj.name}</span>
              <span class="badge-tag">${classObj.icon} ${classObj.name}</span>
            </div>
          </div>
          <button class="card-menu-btn btn-edit-player" data-id="${player.id}" title="Editar / Opciones">
            ⚙️
          </button>
        </div>

        <!-- CARD BODY -->
        <div class="card-body-section">
          
          <!-- LEVEL BLOCK -->
          <div class="stat-box-level">
            <div class="stat-label-title">
              ⭐ Nivel
            </div>
            <div class="level-counter-group">
              <button class="btn-counter btn-lvl-down" data-id="${player.id}">-</button>
              <span class="level-value-display level-val-${player.id}">${player.level}</span>
              <button class="btn-counter btn-lvl-up" data-id="${player.id}">+</button>
            </div>
          </div>

          <!-- STRENGTH / COMBAT POWER BLOCK -->
          <div class="stat-box-strength">
            <div>
              <div class="stat-label-title" style="color: #ff9999;">
                ⚔️ Fuerza Total
              </div>
              <button class="btn-manage-items" data-id="${player.id}">
                🎒 Objetos (${activeItemsCount})
              </button>
            </div>
            <div class="strength-value-display str-val-${player.id}">
              ${totalStrength}
            </div>
          </div>

          <!-- GOLD BLOCK -->
          <div class="stat-box-gold">
            <div class="gold-top-row">
              <span class="stat-label-title" style="color: var(--gold-main);">
                🪙 Oro
              </span>
              <span class="gold-value-display gold-val-${player.id}">
                ${player.gold.toLocaleString('es-AR')}
              </span>
            </div>

            <div class="gold-quick-btns">
              <button class="btn-gold" data-id="${player.id}" data-amount="100">+100</button>
              <button class="btn-gold" data-id="${player.id}" data-amount="500">+500</button>
              <button class="btn-gold" data-id="${player.id}" data-amount="1000">+1.000</button>
              <button class="btn-gold" data-id="${player.id}" data-amount="-100">-100</button>
              <button class="btn-gold" data-id="${player.id}" data-amount="-500">-500</button>
              <button class="btn-gold" data-id="${player.id}" data-amount="-1000">-1.000</button>
              
              <button class="btn-gold btn-gold-sell" data-id="${player.id}">
                🪙 Vender Objetos x Niveles
              </button>
            </div>
          </div>

        </div>

        <!-- CARD FOOTER ACTIONS -->
        <div class="card-footer-actions">
          <button class="btn btn-secondary btn-sm btn-block btn-open-items-modal" data-id="${player.id}">
            ⚔️ Bonificadores
          </button>
          <button class="btn btn-outline btn-sm btn-delete-player" data-id="${player.id}" title="Eliminar">
            🗑️
          </button>
        </div>

      </div>
    `;
  }).join('');

  bindPlayerCardEvents(containerEl);
}

function bindPlayerCardEvents(containerEl) {
  // Level UP
  containerEl.querySelectorAll('.btn-lvl-up').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      Sound.playLevelUp();
      state.modifyLevel(id, 1);
      animateElement(`.level-val-${id}`, 'animate-level-up');
    };
  });

  // Level DOWN
  containerEl.querySelectorAll('.btn-lvl-down').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      Sound.playPenalty();
      state.modifyLevel(id, -1);
      animateElement(`.level-val-${id}`, 'animate-penalty');
    };
  });

  // Gold Quick Buttons
  containerEl.querySelectorAll('.btn-gold:not(.btn-gold-sell)').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const amount = parseInt(btn.dataset.amount, 10);
      if (amount > 0) Sound.playGoldCoin();
      else Sound.playClick();
      state.modifyGold(id, amount);
      animateElement(`.gold-val-${id}`, 'animate-gold-pop');
    };
  });

  // Sell Gold Trigger
  containerEl.querySelectorAll('.btn-gold-sell').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openSellGoldModal(id);
    };
  });

  // Manage Items Modifiers Modal
  containerEl.querySelectorAll('.btn-manage-items, .btn-open-items-modal').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openModifiersModal(id);
    };
  });

  // Edit Player Modal
  containerEl.querySelectorAll('.btn-edit-player').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openEditPlayerModal(id);
    };
  });

  // Delete Player
  containerEl.querySelectorAll('.btn-delete-player').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const player = state.getPlayerById(id);
      if (!player) return;
      
      if (confirm(`¿Eliminar al jugador "${player.name}" de la partida?`)) {
        state.deletePlayer(id);
      }
    };
  });
}

function animateElement(selector, animationClass) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.remove(animationClass);
  void el.offsetWidth;
  el.classList.add(animationClass);
}

function openSellGoldModal(playerId) {
  const player = state.getPlayerById(playerId);
  if (!player) return;

  document.getElementById('sellGoldPlayerName').value = player.name;
  document.getElementById('sellGoldCurrentGold').value = `${player.gold.toLocaleString('es-AR')} Oro`;
  
  const confirmBtn = document.getElementById('btnConfirmSellGold');
  confirmBtn.onclick = () => {
    const amount = parseInt(document.getElementById('sellGoldAmount').value, 10);
    if (state.sellGoldForLevels(playerId, amount)) {
      Sound.playLevelUp();
      document.getElementById('modalSellGold').classList.add('hidden');
    }
  };

  document.getElementById('modalSellGold').classList.remove('hidden');
}

function openModifiersModal(playerId) {
  const modal = document.getElementById('modalModifiers');
  if (!modal) return;
  modal.dataset.playerId = playerId;
  updateModifiersModalUI(playerId);
  modal.classList.remove('hidden');
}

export function updateModifiersModalUI(playerId) {
  const player = state.getPlayerById(playerId);
  if (!player) return;

  document.getElementById('modPlayerName').textContent = player.name;
  document.getElementById('modBaseLevel').textContent = player.level;
  
  const itemsBonus = (player.modifiers || []).reduce((acc, i) => {
    const bonusVal = i.bonus !== undefined ? i.bonus : i.value;
    return acc + (i.active !== false ? bonusVal : 0);
  }, 0);
  const totalStr = player.level + itemsBonus;

  document.getElementById('modTotalItems').textContent = itemsBonus >= 0 ? `+${itemsBonus}` : `${itemsBonus}`;
  document.getElementById('modTotalStrength').textContent = totalStr;

  const listEl = document.getElementById('modifiersList');
  if (!player.modifiers || player.modifiers.length === 0) {
    listEl.innerHTML = '<li class="modifier-item text-muted">No tiene objetos o bonificadores equipados.</li>';
  } else {
    listEl.innerHTML = player.modifiers.map(m => {
      const bonusVal = m.bonus !== undefined ? m.bonus : m.value;
      const sign = bonusVal >= 0 ? `+${bonusVal}` : `${bonusVal}`;
      const typeBadge = m.type === 'temp' ? '🧪 Poción' : '🎒 Objeto';
      return `
        <li class="modifier-item">
          <div class="modifier-info">
            <span class="modifier-val">${sign}</span>
            <div>
              <strong>${m.name}</strong>
              <small class="badge-tag" style="margin-left: 6px;">${typeBadge}</small>
            </div>
          </div>
          <div>
            <button class="btn btn-sm ${m.active ? 'btn-success' : 'btn-outline'} btn-toggle-mod" data-player="${player.id}" data-id="${m.id}">
              ${m.active ? '✅ Equipado' : '❌ Desactivado'}
            </button>
            <button class="btn btn-sm btn-danger btn-remove-mod" data-player="${player.id}" data-id="${m.id}">
              🗑️
            </button>
          </div>
        </li>
      `;
    }).join('');

    listEl.querySelectorAll('.btn-toggle-mod').forEach(b => {
      b.onclick = () => {
        state.toggleModifier(b.dataset.player, b.dataset.id);
        updateModifiersModalUI(playerId);
      };
    });

    listEl.querySelectorAll('.btn-remove-mod').forEach(b => {
      b.onclick = () => {
        state.removeModifier(b.dataset.player, b.dataset.id);
        updateModifiersModalUI(playerId);
      };
    });
  }
}

function openEditPlayerModal(playerId) {
  const player = state.getPlayerById(playerId);
  if (!player) return;

  document.getElementById('modalPlayerTitle').textContent = '⚙️ Editar Jugador';
  document.getElementById('playerFormId').value = player.id;
  document.getElementById('playerFormName').value = player.name;
  document.getElementById('playerFormRace').value = player.race;
  document.getElementById('playerFormClass').value = player.class;
  document.getElementById('playerFormLevel').value = player.level;
  document.getElementById('playerFormGold').value = player.gold;

  renderAvatarPicker(player.avatar);

  document.getElementById('modalPlayer').classList.remove('hidden');
}

export function renderAvatarPicker(selectedId = 'warrior') {
  const grid = document.getElementById('avatarPickerGrid');
  if (!grid) return;

  grid.innerHTML = AVATARS.map(a => `
    <div class="avatar-option ${a.id === selectedId ? 'selected' : ''}" data-avatar-id="${a.id}" title="${a.label}">
      ${a.icon}
    </div>
  `).join('');

  grid.querySelectorAll('.avatar-option').forEach(el => {
    el.onclick = () => {
      grid.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    };
  });
}
