/* ==========================================================================
   COMPONENT — LOBBY MODAL (CREAR & UNIRSE A PARTIDA)
   ========================================================================== */

import { state, AVATARS } from '../state.js';
import { Sound } from '../audio.js';

export function setupLobbyModal() {
  const modal = document.getElementById('modalLobby');
  if (!modal) return;

  // Lobby Sub-Tabs (Crear vs Unirse)
  const tabBtnCreate = document.getElementById('lobbyTabCreate');
  const tabBtnJoin = document.getElementById('lobbyTabJoin');
  const paneCreate = document.getElementById('lobbyPaneCreate');
  const paneJoin = document.getElementById('lobbyPaneJoin');

  if (tabBtnCreate && tabBtnJoin) {
    tabBtnCreate.onclick = () => {
      Sound.playClick();
      tabBtnCreate.classList.add('active');
      tabBtnJoin.classList.remove('active');
      paneCreate.classList.add('active');
      paneJoin.classList.remove('active');
    };

    tabBtnJoin.onclick = () => {
      Sound.playClick();
      tabBtnJoin.classList.add('active');
      tabBtnCreate.classList.remove('active');
      paneJoin.classList.add('active');
      paneCreate.classList.remove('active');
    };
  }

  // Form Create Game
  const formCreate = document.getElementById('formLobbyCreate');
  if (formCreate) {
    formCreate.onsubmit = async (e) => {
      e.preventDefault();
      const playerNameInput = document.getElementById('lobbyCreatePlayerName');
      const playerName = playerNameInput ? playerNameInput.value.trim() : '';
      const maxLevel = parseInt(document.getElementById('lobbyCreateMaxLevel').value, 10) || 10;
      
      if (!playerName) {
        alert('⚠️ Por favor ingresá tu nombre para crear la partida.');
        return;
      }

      const selectedAvatarEl = document.querySelector('#lobbyAvatarCreate .avatar-option.selected');
      const avatar = selectedAvatarEl ? selectedAvatarEl.dataset.avatarId : 'warrior';

      try {
        await state.createNewGame({ playerName, maxLevel, avatar });
        Sound.playVictoryFanfare();
        modal.classList.add('hidden');
      } catch (err) {
        alert(`❌ Error al crear la partida: ${err.message}`);
      }
    };
  }

  // Form Join Game
  const formJoin = document.getElementById('formLobbyJoin');
  if (formJoin) {
    formJoin.onsubmit = async (e) => {
      e.preventDefault();
      const gameCode = document.getElementById('lobbyJoinCode').value;
      const playerName = document.getElementById('lobbyJoinPlayerName').value;

      if (!gameCode || !playerName) {
        alert('⚠️ Por favor ingresá el código de partida y tu nombre.');
        return;
      }

      const selectedAvatarEl = document.querySelector('#lobbyAvatarJoin .avatar-option.selected');
      const avatar = selectedAvatarEl ? selectedAvatarEl.dataset.avatarId : 'mage';

      try {
        await state.joinExistingGame({ gameCode, playerName, avatar });
        Sound.playLevelUp();
        modal.classList.add('hidden');
      } catch (err) {
        alert(`❌ ${err.message}`);
      }
    };
  }
}

export function openLobbyModal(mode = 'create') {
  const modal = document.getElementById('modalLobby');
  if (!modal) return;

  renderAvatarPickerToContainer('lobbyAvatarCreate', 'warrior');
  renderAvatarPickerToContainer('lobbyAvatarJoin', 'mage');

  const tabBtnCreate = document.getElementById('lobbyTabCreate');
  const tabBtnJoin = document.getElementById('lobbyTabJoin');

  if (mode === 'join' && tabBtnJoin) {
    tabBtnJoin.click();
  } else if (tabBtnCreate) {
    tabBtnCreate.click();
  }

  modal.classList.remove('hidden');
}

function renderAvatarPickerToContainer(containerId, defaultSelected = 'warrior') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = AVATARS.map(a => `
    <div class="avatar-option ${a.id === defaultSelected ? 'selected' : ''}" data-avatar-id="${a.id}" title="${a.label}">
      ${a.icon}
    </div>
  `).join('');

  container.querySelectorAll('.avatar-option').forEach(el => {
    el.onclick = () => {
      container.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    };
  });
}
