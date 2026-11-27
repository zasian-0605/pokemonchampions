(function installCpuDifficultyPatch() {
  'use strict';

  const STORAGE_KEY = 'pokemon-champions-cpu-difficulty';
  const LEVELS = new Set(['easy', 'normal', 'hard', 'expert']);

  function normalizeDifficulty(value) {
    const key = String(value || '').trim().toLowerCase();
    return LEVELS.has(key) ? key : 'normal';
  }

  function readDifficulty() {
    try {
      return normalizeDifficulty(window.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return 'normal';
    }
  }

  let selectedDifficulty = readDifficulty();

  function setDifficulty(value) {
    selectedDifficulty = normalizeDifficulty(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, selectedDifficulty);
    } catch (_) {
      // The preference remains usable for the current page even when storage is blocked.
    }
    return selectedDifficulty;
  }

  function estimateDamageScore(input, difficulty) {
    const level = Math.max(1, Number(input.level || 50));
    const power = Math.max(0, Number(input.power || 0));
    const attack = Math.max(1, Number(input.attack || 1));
    const defense = Math.max(1, Number(input.defense || 1));
    const effectiveness = Math.max(0, Number(input.effectiveness ?? 1));
    const stab = Math.max(0, Number(input.stab || 1));
    const accuracy = Math.max(0, Math.min(100, Number(input.accuracy ?? 100)));
    const targetHp = Math.max(0, Number(input.targetHp || 0));
    if (!power || !effectiveness || !accuracy) return 0;

    const base = Math.floor((Math.floor((2 * level) / 5) + 2) * power * attack / defense / 50) + 2;
    const expectedDamage = base * stab * effectiveness * (accuracy / 100);
    let score = expectedDamage;

    if (difficulty === 'hard' || difficulty === 'expert') {
      if (expectedDamage >= targetHp && targetHp > 0) score += 1000 + targetHp;
      else if (targetHp > 0 && expectedDamage >= targetHp * 0.75) score += 35;
    }
    if (difficulty === 'expert' && Number(input.priority || 0) > 0) {
      score += Number(input.priority) * 10;
    }
    return score;
  }

  function scoreCandidate(mon, target, slot, difficulty) {
    const getMove = window.getMove;
    if (typeof getMove !== 'function') return 0;
    const move = getMove(slot && slot.id);
    if (!move || typeof window.isMoveClassifiedDamageV2 !== 'function' ||
        !window.isMoveClassifiedDamageV2(move)) return 0;

    let power = Number(move.basePower || 0);
    if (typeof window.resolvedMovePowerV2 === 'function') {
      power = Number(window.resolvedMovePowerV2(move, mon, target) || power);
    }
    let type = move.type || 'Normal';
    if (typeof window.resolveMoveTypePower === 'function') {
      const resolved = window.resolveMoveTypePower(move);
      if (resolved && resolved.type) type = resolved.type;
      if (resolved && Number(resolved.power) > 0) power = Number(resolved.power);
    }

    const targetSpecies = typeof window.monSpecies === 'function' ? window.monSpecies(target) : null;
    const effectiveness = typeof window.typeMult === 'function'
      ? Number(window.typeMult(type, targetSpecies, target))
      : 1;
    const ownSpecies = typeof window.monSpecies === 'function' ? window.monSpecies(mon) : null;
    const ownTypes = Array.isArray(mon.types) ? mon.types : (ownSpecies && ownSpecies.types) || [];
    const stab = ownTypes.includes(type) ? 1.5 : 1;
    const attackKey = move.category === 'Physical' ? 'atk' : 'spa';
    const defenseKey = move.defensiveCategory === 'Physical' ? 'def'
      : move.defensiveCategory === 'Special' ? 'spd'
      : move.category === 'Physical' ? 'def' : 'spd';
    const attack = typeof window.currentStat === 'function'
      ? window.currentStat(mon, attackKey) : Number(mon.stats && mon.stats[attackKey] || 1);
    const defense = typeof window.currentStat === 'function'
      ? window.currentStat(target, defenseKey) : Number(target.stats && target.stats[defenseKey] || 1);
    const accuracy = move.accuracy === true || move.accuracy == null
      ? 100 : Number(move.accuracy);
    const estimated = estimateDamageScore({
      level: mon.level || 50,
      power,
      attack,
      defense,
      effectiveness,
      stab,
      accuracy,
      targetHp: target.hp,
      priority: move.priority
    }, difficulty);

    return { id: slot.id, score: estimated, effectiveness, power, accuracy };
  }

  const originalChooseEnemyAction = window.chooseEnemyAction;
  if (typeof originalChooseEnemyAction === 'function') {
    window.chooseEnemyAction = function chooseEnemyActionWithDifficulty(mon, target) {
      const difficulty = normalizeDifficulty(mon && mon._cpuDifficulty || selectedDifficulty);
      if (difficulty === 'easy') {
        return originalChooseEnemyAction.apply(this, arguments);
      }

      const candidates = (mon && mon.moves || []).filter(function (slot) {
        return slot && Number(slot.pp) > 0 && typeof window.getMove === 'function' && window.getMove(slot.id);
      });
      if (!candidates.length) {
        return originalChooseEnemyAction.apply(this, arguments);
      }

      const ranked = candidates.map(function (slot) {
        return scoreCandidate(mon, target, slot, difficulty);
      }).filter(function (entry) {
        return entry && entry.score > 0;
      }).sort(function (a, b) {
        return b.score - a.score;
      });

      if (!ranked.length) {
        return originalChooseEnemyAction.apply(this, arguments);
      }

      let selected = ranked[0];
      if (difficulty === 'normal' && ranked.length > 1 && Math.random() < 0.2) {
        selected = ranked[1];
      }
      return {
        actorUid: mon.uid,
        moveId: selected.id,
        targetUid: target && target.uid
      };
    };
  }

  const originalRenderBattlePage = window.renderBattlePage;
  if (typeof originalRenderBattlePage === 'function') {
    window.renderBattlePage = function renderBattlePageWithCpuDifficulty() {
      const html = originalRenderBattlePage.apply(this, arguments);
      if (typeof html !== 'string' || !html.includes('data-action="battle-mode"') ||
          !html.includes('<div class="grid two-col">')) {
        return html;
      }

      const labels = {
        easy: 'かんたん',
        normal: 'ふつう',
        hard: 'むずかしい',
        expert: 'エキスパート'
      };
      const options = ['easy', 'normal', 'hard', 'expert'].map(function (level) {
        return '<option value="' + level + '"' +
          (selectedDifficulty === level ? ' selected' : '') + '>' +
          labels[level] + '</option>';
      }).join('');
      const panel = '<section class="setting-card" style="grid-column:1/-1;margin-bottom:14px">' +
        '<div class="section-kicker">CPU DIFFICULTY</div>' +
        '<label for="cpu-difficulty"><b>CPUの難易度</b></label>' +
        '<select id="cpu-difficulty" class="field" style="max-width:320px;margin-top:8px">' +
        options + '</select>' +
        '<p class="tiny muted" style="margin-bottom:0">難易度はこのブラウザに保存され、次のCPU対戦から反映されます。</p>' +
        '</section>';
      return html.replace('<div class="grid two-col">', panel + '<div class="grid two-col">');
    };
  }

  const originalBeginBattleIntro = window.beginBattleIntro;
  if (typeof originalBeginBattleIntro === 'function') {
    window.beginBattleIntro = function beginBattleIntroWithCpuDifficulty(battle) {
      if (battle && Array.isArray(battle.enemyTeam)) {
        battle.enemyTeam.forEach(function (mon) {
          if (mon) mon._cpuDifficulty = selectedDifficulty;
        });
      }
      return originalBeginBattleIntro.apply(this, arguments);
    };
  }

  if (window.document && typeof window.document.addEventListener === 'function') {
    window.document.addEventListener('change', function (event) {
      const target = event && event.target;
      if (!target || target.id !== 'cpu-difficulty') return;
      setDifficulty(target.value);
      if (typeof window.toast === 'function') {
        window.toast('CPUの難易度を「' + ({
          easy: 'かんたん',
          normal: 'ふつう',
          hard: 'むずかしい',
          expert: 'エキスパート'
        })[selectedDifficulty] + '」に設定しました。', 'good');
      }
    }, true);
  }

  window.PokemonChampions2DCPU = {
    version: 1,
    getDifficulty: function () { return selectedDifficulty; },
    setDifficulty: setDifficulty,
    normalizeDifficulty: normalizeDifficulty,
    estimateDamageScore: estimateDamageScore,
    scoreCandidate: scoreCandidate
  };
})();