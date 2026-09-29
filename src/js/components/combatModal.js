/* ==========================================================================
   COMPONENT — COMBAT ASSISTANT & 3D DICE ROLLER
   ========================================================================== */

import { state, AVATARS } from '../state.js';
import { Sound } from '../audio.js';

export function setupCombatModal() {
  const modal = document.getElementById('modalCombat');
  if (!modal) return;

  const mainSelect = document.getElementById('combatMainPlayer');
  const helperSelect = document.getElementById('combatHelperPlayer');
  const monsterLevelInput = document.getElementById('combatMonsterLevel');
  const monsterCountInput = document.getElementById('combatMonsterCount');
  const monsterExtraInput = document.getElementById('combatMonsterExtraMod');
  const playerExtraInput = document.getElementById('combatPlayerExtraMod');

  // Input change triggers re-calculation
  const inputs = [mainSelect, helperSelect, monsterLevelInput, monsterCountInput, monsterExtraInput, playerExtraInput];
  inputs.forEach(el => {
    if (el) el.onchange = el.oninput = () => calculateCombat();
  });

  // Plus minus steppers inside combat modal
  document.querySelectorAll('#modalCombat .btn-step').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.dataset.target;
      const step = parseInt(btn.dataset.step, 10);
      const input = document.getElementById(targetId);
      if (input) {
        let val = (parseInt(input.value, 10) || 0) + step;
        if (input.min !== undefined && val < parseInt(input.min, 10)) {
          val = parseInt(input.min, 10);
        }
        input.value = val;
        calculateCombat();
      }
    };
  });

  // Win Combat Button
  const btnWin = document.getElementById('btnCombatWin');
  if (btnWin) {
    btnWin.onclick = () => resolveCombatWin();
  }

  // Escape Dice Button
  const btnEscape = document.getElementById('btnCombatEscape');
  if (btnEscape) {
    btnEscape.onclick = () => openDiceRollerModal();
  }
}

export function populateCombatModal() {
  const mainSelect = document.getElementById('combatMainPlayer');
  const helperSelect = document.getElementById('combatHelperPlayer');
  if (!mainSelect || !helperSelect) return;

  const players = state.data.players;
  if (players.length === 0) return;

  // Populate main player dropdown
  mainSelect.innerHTML = players.map(p => {
    const avatar = AVATARS.find(a => a.id === p.avatar)?.icon || '🧙‍♂️';
    return `<option value="${p.id}" ${p.id === state.data.currentTurnPlayerId ? 'selected' : ''}>${avatar} ${p.name} (Lvl ${p.level})</option>`;
  }).join('');

  // Populate helper dropdown
  updateHelperDropdown();
  mainSelect.onchange = () => {
    updateHelperDropdown();
    calculateCombat();
  };

  calculateCombat();
}

function updateHelperDropdown() {
  const mainSelect = document.getElementById('combatMainPlayer');
  const helperSelect = document.getElementById('combatHelperPlayer');
  if (!mainSelect || !helperSelect) return;

  const selectedMainId = mainSelect.value;
  const players = state.data.players;

  helperSelect.innerHTML = '<option value="NONE">Sin Ayudante</option>' + 
    players
      .filter(p => p.id !== selectedMainId)
      .map(p => {
        const avatar = AVATARS.find(a => a.id === p.avatar)?.icon || '🧙‍♂️';
        const str = state.calculatePlayerStrength(p);
        return `<option value="${p.id}">${avatar} ${p.name} (Fuerza ${str})</option>`;
      }).join('');
}

export function calculateCombat() {
  const mainSelect = document.getElementById('combatMainPlayer');
  const helperSelect = document.getElementById('combatHelperPlayer');
  if (!mainSelect || !mainSelect.value) return;

  const mainPlayer = state.getPlayerById(mainSelect.value);
  if (!mainPlayer) return;

  const helperId = helperSelect.value;
  const helperPlayer = helperId !== 'NONE' ? state.getPlayerById(helperId) : null;

  // Render Hero Cards inside Combat
  renderCombatHeroCard('mainPlayerCombatCard', mainPlayer);
  const helperCardContainer = document.getElementById('helperPlayerCombatCard');
  if (helperPlayer) {
    renderCombatHeroCard('helperPlayerCombatCard', helperPlayer);
    helperCardContainer.classList.remove('hidden');
  } else {
    helperCardContainer.classList.add('hidden');
  }

  // Calculate Hero Strength
  const mainStr = state.calculatePlayerStrength(mainPlayer);
  const helperStr = helperPlayer ? state.calculatePlayerStrength(helperPlayer) : 0;
  const playerExtra = parseInt(document.getElementById('combatPlayerExtraMod')?.value, 10) || 0;
  
  const totalHeroStrength = mainStr + helperStr + playerExtra;
  document.getElementById('totalHeroStrength').textContent = totalHeroStrength;

  // Calculate Monster Strength
  const monsterLevel = Math.max(1, parseInt(document.getElementById('combatMonsterLevel')?.value, 10) || 1);
  const monsterCount = Math.max(1, parseInt(document.getElementById('combatMonsterCount')?.value, 10) || 1);
  const monsterExtra = parseInt(document.getElementById('combatMonsterExtraMod')?.value, 10) || 0;

  const totalMonsterStrength = (monsterLevel * monsterCount) + monsterExtra;
  document.getElementById('totalMonsterStrength').textContent = totalMonsterStrength;

  // Evaluate Status
  const statusBox = document.getElementById('combatStatusBox');
  const statusIcon = document.getElementById('combatStatusIcon');
  const statusText = document.getElementById('combatStatusText');
  const statusSub = document.getElementById('combatStatusSub');

  statusBox.classList.remove('status-win', 'status-lose', 'status-help');

  const isWarrior = mainPlayer.class === 'guerrero' || helperPlayer?.class === 'guerrero';

  // Standard Munchkin Rule: Player must BEAT monster (TotalHero > TotalMonster), unless Warrior (wins ties)
  let isWinning = false;
  if (isWarrior) {
    isWinning = totalHeroStrength >= totalMonsterStrength;
  } else {
    isWinning = totalHeroStrength > totalMonsterStrength;
  }

  if (isWinning) {
    statusBox.classList.add('status-win');
    statusIcon.textContent = '🟢';
    statusText.textContent = '¡GANÁS!';
    statusSub.textContent = `Tu fuerza (${totalHeroStrength}) supera a los monstruos (${totalMonsterStrength})`;
  } else if (totalHeroStrength === totalMonsterStrength || totalHeroStrength === totalMonsterStrength - 1) {
    statusBox.classList.add('status-help');
    statusIcon.textContent = '⚠️';
    statusText.textContent = 'EMPATE / NECESITÁS AYUDA';
    statusSub.textContent = isWarrior ? '¡Sos Guerrero, así que ganás los empates!' : 'En Munchkin el monstruo gana en empate. ¡Buscá ayuda o usá una poción!';
  } else {
    statusBox.classList.add('status-lose');
    statusIcon.textContent = '🔴';
    statusText.textContent = 'PERDÉS';
    statusSub.textContent = `Fuerza Monstruos: ${totalMonsterStrength} vs Tu Fuerza: ${totalHeroStrength}`;
  }
}

function renderCombatHeroCard(containerId, player) {
  const container = document.getElementById(containerId);
  if (!container || !player) return;

  const avatarObj = AVATARS.find(a => a.id === player.avatar) || AVATARS[0];
  const str = state.calculatePlayerStrength(player);

  container.innerHTML = `
    <div style="font-size: 1.8rem;">${avatarObj.icon}</div>
    <div>
      <strong style="color: var(--gold-light); display: block;">${player.name}</strong>
      <small class="text-muted">Nivel ${player.level} | Fuerza Total: <strong style="color: #ff9999;">${str}</strong></small>
    </div>
  `;
}

function resolveCombatWin() {
  const mainSelect = document.getElementById('combatMainPlayer');
  if (!mainSelect) return;

  const mainPlayer = state.getPlayerById(mainSelect.value);
  if (!mainPlayer) return;

  const helperSelect = document.getElementById('combatHelperPlayer');
  const helperPlayer = helperSelect.value !== 'NONE' ? state.getPlayerById(helperSelect.value) : null;

  const levelsWon = 1; // standard monster gives 1 level
  state.modifyLevel(mainPlayer.id, levelsWon);

  mainPlayer.stats.monstersDefeated++;
  state.data.stats.totalMonstersDefeated++;
  state.data.stats.totalCombatsPlayed++;

  if (helperPlayer) {
    // If helper is Elf, Elves gain 1 level for helping in combat!
    if (helperPlayer.race === 'elfo') {
      state.modifyLevel(helperPlayer.id, 1);
      state.addHistoryItem('LEVEL', helperPlayer.name, `🧝 ¡${helperPlayer.name} subió 1 Nivel por ayudar como Elfo!`);
    }
  }

  state.addHistoryItem('COMBAT', mainPlayer.name, `⚔️ ¡${mainPlayer.name} derrotó al monstruo en combate!`);
  Sound.playVictoryFanfare();

  document.getElementById('modalCombat').classList.add('hidden');
}

/* 3D DICE ROLLER */
export function setupDiceRoller() {
  const btnRoll = document.getElementById('btnRollDice');
  if (btnRoll) {
    btnRoll.onclick = () => rollEscapeDice();
  }
}

function openDiceRollerModal() {
  document.getElementById('diceResultBox').classList.add('hidden');
  document.getElementById('modalDice').classList.remove('hidden');
}

function rollEscapeDice() {
  const cube = document.getElementById('diceCube');
  const resultBox = document.getElementById('diceResultBox');
  const resultNum = document.getElementById('diceResultNumber');
  const resultText = document.getElementById('diceResultText');

  resultBox.classList.add('hidden');
  cube.classList.add('rolling');
  Sound.playDiceRoll();

  const mainPlayerId = document.getElementById('combatMainPlayer')?.value;
  const player = state.getPlayerById(mainPlayerId);
  const isElf = player?.race === 'elfo';

  setTimeout(() => {
    cube.classList.remove('rolling');
    
    // Generate random 1d6 (1 to 6)
    const roll = Math.floor(Math.random() * 6) + 1;
    
    // Set 3D rotation coordinates for standard dice faces
    const rotations = {
      1: 'rotateX(0deg) rotateY(0deg)',
      6: 'rotateX(0deg) rotateY(180deg)',
      3: 'rotateX(0deg) rotateY(-90deg)',
      4: 'rotateX(0deg) rotateY(90deg)',
      2: 'rotateX(-90deg) rotateY(0deg)',
      5: 'rotateX(90deg) rotateY(0deg)'
    };

    cube.style.transform = rotations[roll];
    resultNum.textContent = roll;

    // Check escape rule: 5 or 6 (or 4+ if Elf)
    const required = isElf ? 4 : 5;
    const isSuccess = roll >= required;

    if (player) {
      player.stats.escapeAttempts++;
      state.data.stats.totalEscapesAttempted++;
    }

    if (isSuccess) {
      if (player) {
        player.stats.escapesSuccessful++;
        state.data.stats.totalEscapesSuccessful++;
      }
      resultText.textContent = `🟢 ¡ESCAPASTE CON ÉXITO! (${isElf ? 'Bonus Elfo +1' : 'Resultado 5-6'})`;
      resultText.style.color = '#82fcae';
      Sound.playLevelUp();
      state.addHistoryItem('DICE', player?.name, `🎲 ${player?.name} tiró un ${roll} y ESCAPÓ del combate.`);
    } else {
      if (player) player.stats.combatsLost++;
      resultText.textContent = '🔴 ¡NO PUDISTE ESCAPAR! Recibe el Mal Rollito';
      resultText.style.color = '#ff9999';
      Sound.playPenalty();
      state.addHistoryItem('DICE', player?.name, `🎲 ${player?.name} tiró un ${roll} y NO pudo escapar.`);
    }

    resultBox.classList.remove('hidden');
  }, 900);
}
