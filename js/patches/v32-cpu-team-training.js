(function installCpuTeamTrainingPatch() {
  'use strict';

  const api = window.PokemonChampions2DCPU;
  if (!api || typeof api.getDifficulty !== 'function') return;

  function offensiveProfile(mon) {
    const slots = Array.isArray(mon && mon.moves) ? mon.moves : [];
    let physical = 0;
    let special = 0;
    for (const slot of slots) {
      const move = typeof window.getMove === 'function' ? window.getMove(slot && slot.id) : null;
      if (!move || move.category === 'Status') continue;
      let power = Number(move.basePower || 0);
      if (typeof window.resolvedMovePowerV2 === 'function') {
        power = Number(window.resolvedMovePowerV2(move, mon, null) || power);
      }
      if (move.category === 'Physical') physical += power;
      else if (move.category === 'Special') special += power;
    }
    return physical >= special
      ? { key: 'atk', nature: 'ようき', physical: true }
      : { key: 'spa', nature: 'おくびょう', physical: false };
  }

  function tuneCpuMon(mon, difficulty) {
    const level = String(difficulty || 'normal').toLowerCase();
    if (!mon || !['normal', 'hard', 'expert'].includes(level)) return false;
    if (typeof window.calcStats !== 'function') return false;

    const profile = offensiveProfile(mon);
    const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    if (level === 'normal') {
      evs.hp = 128;
      evs[profile.key] = 128;
      evs.spe = 252;
    } else {
      evs.hp = 4;
      evs[profile.key] = 252;
      evs.spe = 252;
    }

    const hpRatio = mon.maxhp > 0 ? Math.max(0, Math.min(1, Number(mon.hp || 0) / mon.maxhp)) : 1;
    mon.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    mon.evs = evs;
    mon.nature = profile.nature;
    mon.heldItem = level === 'normal' ? (mon.heldItem || '') : 'lifeorb';

    const calculated = window.calcStats(mon);
    if (!calculated || typeof calculated !== 'object') return false;
    const stats = { ...calculated };

    if (level === 'expert') {
      for (const key of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
        stats[key] = Math.max(1, Math.floor(Number(stats[key] || 1) * 1.05));
      }
    }

    mon.stats = stats;
    mon.maxhp = Math.max(1, Number(stats.hp || 1));
    mon.hp = Math.max(1, Math.min(mon.maxhp, Math.round(mon.maxhp * hpRatio)));
    mon._cpuDifficulty = level;
    mon._cpuTraining = {
      nature: mon.nature,
      evs: { ...evs },
      heldItem: mon.heldItem,
      expertStatMultiplier: level === 'expert' ? 1.05 : 1
    };
    return true;
  }

  function tuneCpuTeam(battle, difficulty) {
    if (!battle || battle.mode === 'raid' || !Array.isArray(battle.enemyTeam)) return 0;
    const level = String(difficulty || api.getDifficulty()).toLowerCase();
    if (level === 'easy') return 0;
    let changed = 0;
    for (const mon of battle.enemyTeam) {
      if (tuneCpuMon(mon, level)) changed++;
    }
    return changed;
  }

  const previousBeginBattleIntro = window.beginBattleIntro;
  if (typeof previousBeginBattleIntro === 'function') {
    window.beginBattleIntro = function beginBattleIntroWithCpuTraining(battle) {
      if (battle && battle.mode !== 'raid') {
        tuneCpuTeam(battle, api.getDifficulty());
      }
      return previousBeginBattleIntro.apply(this, arguments);
    };
  }

  window.PokemonChampions2DCPU = Object.assign({}, api, {
    tuneCpuMon: tuneCpuMon,
    tuneCpuTeam: tuneCpuTeam,
    offensiveProfile: offensiveProfile
  });
})();