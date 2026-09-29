/* ==========================================================================
   COMPONENT — CHRONOLOGICAL HISTORY LOG
   ========================================================================== */

import { state } from '../state.js';

export function renderHistoryLog(listEl) {
  if (!listEl) return;

  const playerFilter = document.getElementById('historyFilterPlayer')?.value || 'ALL';
  const typeFilter = document.getElementById('historyFilterType')?.value || 'ALL';

  let items = state.data.history;

  if (playerFilter !== 'ALL') {
    items = items.filter(i => i.playerName === playerFilter);
  }

  if (typeFilter !== 'ALL') {
    items = items.filter(i => i.type === typeFilter);
  }

  const badgeBadgeEl = document.getElementById('historyCountBadge');
  if (badgeBadgeEl) badgeBadgeEl.textContent = state.data.history.length;

  if (items.length === 0) {
    listEl.innerHTML = '<div class="history-item text-muted">No hay eventos registrados en el historial.</div>';
    return;
  }

  listEl.innerHTML = items.map(item => {
    return `
      <div class="history-item type-${item.type}">
        <div>
          <span class="history-time">${item.timestamp}</span>
          <span class="history-desc">${item.description}</span>
        </div>
      </div>
    `;
  }).join('');
}

export function populateHistoryPlayerFilter() {
  const filterEl = document.getElementById('historyFilterPlayer');
  if (!filterEl) return;

  const selected = filterEl.value;
  const players = state.data.players;

  filterEl.innerHTML = '<option value="ALL">Todos los Jugadores</option>' + 
    players.map(p => `<option value="${p.name}" ${p.name === selected ? 'selected' : ''}>${p.name}</option>`).join('');
}
