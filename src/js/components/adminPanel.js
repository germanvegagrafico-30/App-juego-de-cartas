/* ==========================================================================
   COMPONENT — ADMIN PANEL & TURN CONTROL
   ========================================================================== */

import { state, AVATARS } from '../state.js';
import { StorageManager } from '../storage.js';
import { Sound } from '../audio.js';

export function renderTurnBanner(containerEl) {
  if (!containerEl) return;

  const currentTurnPlayer = state.getPlayerById(state.data.currentTurnPlayerId);
  const totalTurnCount = state.data.turnCount;

  const maxLevelDisplay = document.getElementById('maxLevelDisplay');
  if (maxLevelDisplay) maxLevelDisplay.textContent = state.data.config.maxLevel || 10;

  const turnCounterDisplay = document.getElementById('turnCounterDisplay');
  if (turnCounterDisplay) turnCounterDisplay.textContent = totalTurnCount;

  if (!currentTurnPlayer) {
    containerEl.innerHTML = `
      <div class="turn-pill">
        <span>🔄 Esperando jugadores...</span>
      </div>
    `;
    return;
  }

  const avatarObj = AVATARS.find(a => a.id === currentTurnPlayer.avatar)?.icon || '🧙‍♂️';

  containerEl.innerHTML = `
    <div class="turn-pill">
      <span>Turno de:</span>
      <span class="turn-player-name">${avatarObj} ${currentTurnPlayer.name}</span>
    </div>
    <button id="btnNextTurn" class="btn btn-primary btn-sm">
      FINALIZAR TURNO 🔄
    </button>
  `;

  const btnNext = document.getElementById('btnNextTurn');
  if (btnNext) {
    btnNext.onclick = () => {
      Sound.playClick();
      state.nextTurn();
    };
  }
}

export function setupAdminPanel() {
  // Save Max Level Config
  const btnSaveCfg = document.getElementById('btnSaveConfig');
  if (btnSaveCfg) {
    btnSaveCfg.onclick = () => {
      const maxVal = parseInt(document.getElementById('cfgMaxLevel').value, 10) || 10;
      state.data.config.maxLevel = Math.max(1, maxVal);
      state.addHistoryItem('SYSTEM', null, `🎯 Nivel de victoria configurado a: ${state.data.config.maxLevel}`);
      state.notify();
      alert(`✅ Configuración guardada. Nivel de victoria: ${state.data.config.maxLevel}`);
      document.getElementById('modalAdmin').classList.add('hidden');
    };
  }

  // Export Game JSON
  const btnExport = document.getElementById('btnExportGame');
  if (btnExport) {
    btnExport.onclick = () => {
      StorageManager.exportToFile(state.data);
    };
  }

  // Import Game JSON
  const importInput = document.getElementById('importGameFile');
  if (importInput) {
    importInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const loadedData = await StorageManager.importFromFile(file);
        state.loadStateData(loadedData);
        alert('🎉 ¡Partida importada exitosamente!');
        document.getElementById('modalAdmin').classList.add('hidden');
      } catch (err) {
        alert(`❌ Error al importar: ${err.message}`);
      }
      importInput.value = '';
    };
  }

  // Reset Game
  const btnReset = document.getElementById('btnResetGame');
  if (btnReset) {
    btnReset.onclick = () => {
      if (confirm('⚠️ ¿Estás seguro de REINICIAR COMPLETAMENTE la partida? Se borrarán todos los jugadores e historial.')) {
        state.resetGame();
        document.getElementById('modalAdmin').classList.add('hidden');
      }
    };
  }
}
