/* ==========================================================================
   APP ENTRY POINT — MUNCHKIN ASSISTANT & DASHBOARD MULTIJUGADOR PWA
   ========================================================================== */

import '../css/main.css';
import '../css/components.css';
import '../css/combat.css';
import '../css/animations.css';

import { state } from './state.js';
import { Sound } from './audio.js';
import { renderPlayerCards, renderAvatarPicker, updateModifiersModalUI } from './components/playerCard.js';
import { renderTurnBanner, setupAdminPanel } from './components/adminPanel.js';
import { renderLeaderboard } from './components/leaderboard.js';
import { renderHistoryLog, populateHistoryPlayerFilter } from './components/historyLog.js';
import { setupCombatModal, populateCombatModal, setupDiceRoller } from './components/combatModal.js';
import { renderStats, setupVictorySystem } from './components/statsModal.js';
import { setupLobbyModal, openLobbyModal } from './components/lobbyModal.js';

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Initialize State
  state.init();

  // 2. Setup Subscriptions (Re-renders UI on State Change)
  state.subscribe((data) => {
    // Render Game Code
    const codeDisplay = document.getElementById('displayGameCode');
    if (codeDisplay) codeDisplay.textContent = data.gameCode || 'MUNCHKIN-DEMO';

    // Render Player Cards
    renderPlayerCards(document.getElementById('playerCardsGrid'));
    
    // Render Turn Banner
    renderTurnBanner(document.getElementById('turnBanner'));

    // Render Leaderboard
    renderLeaderboard(document.querySelector('#leaderboardTable tbody'));

    // Render History
    renderHistoryLog(document.getElementById('historyLogList'));

    // Render Stats
    renderStats(document.getElementById('statsContainer'));

    // Update Counts & Badges
    const badgeEl = document.getElementById('playerCountBadge');
    if (badgeEl) badgeEl.textContent = data.players.length;

    populateHistoryPlayerFilter();
    populateCombatModal();
  });

  // 3. Setup Lobby Modal (Crear & Unirse a Partida)
  setupLobbyModal();

  // 4. Setup Navigation Tabs (Scoped strictly to main dashboard tabs)
  setupTabNavigation();

  // 5. Setup Modal Closers & Form Controls
  setupModalControls();

  // 6. Setup Player Form Submit Handler
  setupPlayerForm();

  // 7. Setup Item Modifiers Form Handler
  setupModifiersForm();

  // 8. Setup Sound & Music Player Controls
  setupSoundControl();
  setupMusicPlayerControl();

  // 9. Setup Copy Game Code Button
  setupCopyCodeControl();

  // 10. Setup PWA Installer & Service Worker Registration
  setupPwaInstaller();

  // 11. Setup Sub-components
  setupAdminPanel();
  setupCombatModal();
  setupDiceRoller();
  setupVictorySystem();

  // Initial trigger for subscribers
  state.notify();
});

/* ==========================================================================
   HELPER INITIALIZERS
   ========================================================================== */

function setupMusicPlayerControl() {
  const btnOpen = document.getElementById('btnOpenMusic');
  const modal = document.getElementById('modalMusicPlayer');
  if (btnOpen && modal) {
    btnOpen.onclick = () => {
      Sound.playClick();
      modal.classList.remove('hidden');
    };
  }

  // Play Medieval Themes
  document.querySelectorAll('.btn-play-theme').forEach(btn => {
    btn.onclick = () => {
      const theme = btn.dataset.theme;
      Sound.playMusicTheme(theme);

      // Update UI buttons
      document.querySelectorAll('.btn-play-theme').forEach(b => {
        b.textContent = '▶️ Escuchar';
        b.classList.remove('btn-success');
        b.classList.add('btn-primary');
      });

      btn.textContent = '🔊 Sonando...';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
    };
  });

  // Stop Music
  const btnStop = document.getElementById('btnStopMusic');
  if (btnStop) {
    btnStop.onclick = () => {
      Sound.stopMusic();
      document.querySelectorAll('.btn-play-theme').forEach(b => {
        b.textContent = '▶️ Escuchar';
        b.classList.remove('btn-success');
        b.classList.add('btn-primary');
      });
    };
  }
}

function setupPwaInstaller() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('✅ Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('Service Worker info:', err);
      });
    });
  }

  let deferredPrompt;
  const btnInstall = document.getElementById('btnInstallPwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  if (btnInstall) {
    btnInstall.onclick = async () => {
      Sound.playClick();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('User accepted PWA installation');
        }
        deferredPrompt = null;
      } else {
        // Show PWA installation modal guide for iPhone / Android
        const modal = document.getElementById('modalPwaInstall');
        if (modal) modal.classList.remove('hidden');
      }
    };
  }
}

function setupTabNavigation() {
  const tabs = document.querySelectorAll('.main-tab-btn');
  tabs.forEach(btn => {
    btn.onclick = () => {
      Sound.playClick();
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.app-main .tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    };
  });
}

function setupModalControls() {
  // Close Modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = () => {
      const modalId = btn.dataset.close;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('hidden');
    };
  });

  // Open Lobby Modal
  const btnLobby = document.getElementById('btnOpenLobby');
  if (btnLobby) {
    btnLobby.onclick = () => openLobbyModal('create');
  }

  // Open Add Player Modal
  const btnAdd = document.getElementById('btnAddPlayer');
  const btnEmptyAdd = document.getElementById('btnEmptyAddPlayer');
  
  const openNewPlayer = () => {
    document.getElementById('modalPlayerTitle').textContent = '🧙‍♂️ Nuevo Jugador';
    document.getElementById('playerFormId').value = '';
    document.getElementById('playerFormName').value = '';
    document.getElementById('playerFormRace').value = 'sin_raza';
    document.getElementById('playerFormClass').value = 'sin_clase';
    document.getElementById('playerFormLevel').value = '1';
    document.getElementById('playerFormGold').value = '0';
    renderAvatarPicker('warrior');
    document.getElementById('modalPlayer').classList.remove('hidden');
  };

  if (btnAdd) btnAdd.onclick = openNewPlayer;
  if (btnEmptyAdd) btnEmptyAdd.onclick = openNewPlayer;

  // Open Combat Modal
  const btnCombat = document.getElementById('btnOpenCombat');
  if (btnCombat) {
    btnCombat.onclick = () => {
      populateCombatModal();
      document.getElementById('modalCombat').classList.remove('hidden');
    };
  }

  // Open Admin Modal
  const btnAdmin = document.getElementById('btnOpenAdmin');
  if (btnAdmin) {
    btnAdmin.onclick = () => {
      document.getElementById('cfgMaxLevel').value = state.data.config.maxLevel || 10;
      document.getElementById('modalAdmin').classList.remove('hidden');
    };
  }

  // History Filter Changes
  const historyFilterPlayer = document.getElementById('historyFilterPlayer');
  const historyFilterType = document.getElementById('historyFilterType');
  const btnClearHistory = document.getElementById('btnClearHistory');

  if (historyFilterPlayer) historyFilterPlayer.onchange = () => renderHistoryLog(document.getElementById('historyLogList'));
  if (historyFilterType) historyFilterType.onchange = () => renderHistoryLog(document.getElementById('historyLogList'));
  if (btnClearHistory) {
    btnClearHistory.onclick = () => {
      if (confirm('¿Limpiar todo el historial de eventos de la partida?')) {
        state.clearHistory();
      }
    };
  }
}

function setupPlayerForm() {
  const form = document.getElementById('formPlayer');
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('playerFormId').value;
    const name = document.getElementById('playerFormName').value;
    const race = document.getElementById('playerFormRace').value;
    const className = document.getElementById('playerFormClass').value;
    const level = parseInt(document.getElementById('playerFormLevel').value, 10) || 1;
    const gold = parseInt(document.getElementById('playerFormGold').value, 10) || 0;
    
    const selectedAvatarEl = document.querySelector('.avatar-option.selected');
    const avatar = selectedAvatarEl ? selectedAvatarEl.dataset.avatarId : 'warrior';

    if (id) {
      // Edit Existing Player
      state.updatePlayer(id, { name, avatar, race, class: className });
      state.setLevelDirect(id, level);
      const player = state.getPlayerById(id);
      if (player && player.gold !== gold) {
        player.gold = gold;
        state.notify();
      }
    } else {
      // Create New Player
      state.createPlayer({ name, avatar, race, class: className, level, gold });
      Sound.playLevelUp();
    }

    document.getElementById('modalPlayer').classList.add('hidden');
  };
}

function setupModifiersForm() {
  const form = document.getElementById('formAddModifier');
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    const playerId = document.getElementById('modalModifiers').dataset.playerId;
    if (!playerId) return;

    const name = document.getElementById('modInputName').value;
    const value = parseInt(document.getElementById('modInputValue').value, 10) || 0;
    const type = document.getElementById('modInputType').value;

    state.addModifier(playerId, { name, value, type });
    Sound.playClick();

    document.getElementById('modInputName').value = '';
    document.getElementById('modInputValue').value = '1';
    
    updateModifiersModalUI(playerId);
  };
}

function setupSoundControl() {
  const btn = document.getElementById('btnSoundToggle');
  const icon = document.getElementById('soundIcon');
  if (!btn || !icon) return;

  btn.onclick = () => {
    const enabled = Sound.toggleSound();
    icon.textContent = enabled ? '🔊' : '🔇';
    state.data.config.soundEnabled = enabled;
    state.notify();
  };
}

function setupCopyCodeControl() {
  const btn = document.getElementById('btnCopyCode');
  if (!btn) return;

  btn.onclick = () => {
    const code = state.data.gameCode || 'MUNCHKIN-DEMO';
    navigator.clipboard.writeText(code).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✅ Copiado!';
      setTimeout(() => btn.textContent = orig, 2000);
    }).catch(() => {
      alert(`Código de Partida: ${code}`);
    });
  };
}
