/* ==========================================================================
   COMPONENT — STATISTICS & VICTORY MODAL
   ========================================================================== */

import { state } from '../state.js';
import confetti from 'canvas-confetti';
import { Sound } from '../audio.js';

export function renderStats(containerEl) {
  if (!containerEl) return;

  const players = state.data.players;
  const globalStats = state.data.stats;

  if (players.length === 0) {
    containerEl.innerHTML = '<div class="card-panel text-center text-muted">No hay estadísticas disponibles todavía.</div>';
    return;
  }

  // Find award winners
  let highestGoldPlayer = players[0];
  let mostMonstersPlayer = players[0];
  let mostEscapesPlayer = players[0];

  players.forEach(p => {
    if (p.gold > highestGoldPlayer.gold) highestGoldPlayer = p;
    if (p.stats.monstersDefeated > mostMonstersPlayer.stats.monstersDefeated) mostMonstersPlayer = p;
    if (p.stats.escapesSuccessful > mostEscapesPlayer.stats.escapesSuccessful) mostEscapesPlayer = p;
  });

  containerEl.innerHTML = `
    <div class="card-panel" style="margin-bottom: 20px;">
      <h2 style="font-family: var(--font-title); color: var(--gold-light); margin-bottom: 15px;">📊 Resumen de la Partida</h2>
      
      <div class="award-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div class="award-card text-center">
          <div class="award-icon">🪙</div>
          <div class="award-title">El Más Codicioso</div>
          <div class="award-val">${highestGoldPlayer.name}</div>
          <small class="text-muted">${highestGoldPlayer.gold.toLocaleString('es-AR')} Oro</small>
        </div>

        <div class="award-card text-center">
          <div class="award-icon">👹</div>
          <div class="award-title">Cazador de Monstruos</div>
          <div class="award-val">${mostMonstersPlayer.name}</div>
          <small class="text-muted">${mostMonstersPlayer.stats.monstersDefeated} Derrotados</small>
        </div>

        <div class="award-card text-center">
          <div class="award-icon">🎲</div>
          <div class="award-title">El Escapista Maestro</div>
          <div class="award-val">${mostEscapesPlayer.name}</div>
          <small class="text-muted">${mostEscapesPlayer.stats.escapesSuccessful} Huidas Éxito</small>
        </div>

        <div class="award-card text-center">
          <div class="award-icon">🔄</div>
          <div class="award-title">Turnos Totales</div>
          <div class="award-val">#${state.data.turnCount}</div>
          <small class="text-muted">Rondas Jugadas</small>
        </div>
      </div>
    </div>

    <div class="card-panel">
      <h3 style="font-family: var(--font-title); color: var(--gold-main); margin-bottom: 15px;">👤 Estadísticas Detalladas por Jugador</h3>
      
      <div class="table-responsive">
        <table class="munchkin-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Niveles Ganados</th>
              <th>Niveles Perdidos</th>
              <th>Monstruos Defeated</th>
              <th>Huidas Intentadas</th>
              <th>Huidas Exitosas</th>
              <th>Oro Acumulado</th>
            </tr>
          </thead>
          <tbody>
            ${players.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td><span style="color: #82fcae;">+${p.stats.levelsGained}</span></td>
                <td><span style="color: #ff9999;">-${p.stats.levelsLost}</span></td>
                <td>👹 ${p.stats.monstersDefeated}</td>
                <td>🎲 ${p.stats.escapeAttempts}</td>
                <td>🟢 ${p.stats.escapesSuccessful}</td>
                <td>🪙 ${p.stats.goldEarned.toLocaleString('es-AR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function setupVictorySystem() {
  window.onMunchkinVictory = (winnerPlayer) => {
    const modal = document.getElementById('modalVictory');
    if (!modal) return;

    document.getElementById('winnerNameDisplay').textContent = winnerPlayer.name;

    // Confetti effect!
    try {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.log('Confetti triggered');
    }

    Sound.playVictoryFanfare();

    // Render Victory Podium
    const podiumEl = document.getElementById('victoryPodium');
    if (podiumEl) {
      podiumEl.innerHTML = `
        <div class="award-card text-center">
          <div class="award-icon">⭐</div>
          <div class="award-title">Nivel Alcanzado</div>
          <div class="award-val">${winnerPlayer.level}</div>
        </div>
        <div class="award-card text-center">
          <div class="award-icon">🪙</div>
          <div class="award-title">Oro Acumulado</div>
          <div class="award-val">${winnerPlayer.gold.toLocaleString('es-AR')}</div>
        </div>
        <div class="award-card text-center">
          <div class="award-icon">⚔️</div>
          <div class="award-title">Fuerza Final</div>
          <div class="award-val">${state.calculatePlayerStrength(winnerPlayer)}</div>
        </div>
      `;
    }

    modal.classList.remove('hidden');

    const btnNew = document.getElementById('btnVictoryNewGame');
    if (btnNew) {
      btnNew.onclick = () => {
        state.resetGame();
        modal.classList.add('hidden');
      };
    }
  };
}
