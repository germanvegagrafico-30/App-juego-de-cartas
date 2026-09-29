/* ==========================================================================
   COMPONENT — LEADERBOARD SUMMARY TABLE
   ========================================================================== */

import { state, AVATARS, RACES, CLASSES } from '../state.js';

export function renderLeaderboard(tbodyEl) {
  if (!tbodyEl) return;

  const players = [...state.data.players];
  if (players.length === 0) {
    tbodyEl.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay jugadores registrados en la partida.</td></tr>';
    return;
  }

  // Sort primarily by Level (descending), secondarily by Total Strength (descending)
  players.sort((a, b) => {
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    const strB = state.calculatePlayerStrength(b);
    const strA = state.calculatePlayerStrength(a);
    return strB - strA;
  });

  tbodyEl.innerHTML = players.map((player, index) => {
    const isCurrentTurn = state.data.currentTurnPlayerId === player.id;
    const avatarIcon = AVATARS.find(a => a.id === player.avatar)?.icon || '🧙‍♂️';
    const raceObj = RACES[player.race] || RACES.sin_raza;
    const classObj = CLASSES[player.class] || CLASSES.sin_clase;
    const totalStr = state.calculatePlayerStrength(player);

    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';

    return `
      <tr class="${isCurrentTurn ? 'row-turn' : ''}">
        <td>
          <span class="rank-badge ${rankClass}">#${index + 1}</span>
        </td>
        <td>
          <strong>${avatarIcon} ${player.name}</strong>
        </td>
        <td>
          <span class="badge-tag">${raceObj.icon} ${raceObj.name}</span>
        </td>
        <td>
          <span class="badge-tag">${classObj.icon} ${classObj.name}</span>
        </td>
        <td>
          <strong style="color: var(--gold-main); font-size: 1.2rem;">⭐ ${player.level}</strong>
        </td>
        <td>
          🪙 ${player.gold.toLocaleString('es-AR')}
        </td>
        <td>
          <strong style="color: #ff9999; font-size: 1.1rem;">⚔️ ${totalStr}</strong>
        </td>
        <td>
          ${isCurrentTurn ? '<span class="badge-tag" style="background: var(--gold-main); color: #000; font-weight: 800;">🔄 EN TURNO</span>' : '<span class="text-muted">-</span>'}
        </td>
      </tr>
    `;
  }).join('');
}
