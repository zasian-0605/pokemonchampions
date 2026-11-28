/* v37: align Dream Eater's legacy battle guard with the pinned Showdown mechanics. */
(() => {
  "use strict";

  const W = window;
  const toId = value => String(value ?? "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  function isDreamEater(move) {
    return toId(move?.id || move?.showdownId || move?.name) === "dreameater" ||
      Number(move?.apiId || move?.num || 0) === 138 ||
      move?.jpName === "ゆめくい";
  }

  function isComatose(target) {
    const ability = String(target?.abilityId || target?.ability || "");
    return toId(ability) === "comatose" || ability === "ぜったいねむり";
  }

  function dreamEaterCanHit(target) {
    return target?.status === "slp" || isComatose(target);
  }

  const originalAbilityTriggerOnMove = W.abilityTriggerOnMove;
  if (typeof originalAbilityTriggerOnMove === "function") {
    W.abilityTriggerOnMove = function guardDreamEaterSleep(actor, target, move, battle) {
      if (isDreamEater(move) && !dreamEaterCanHit(target)) {
        if (typeof W.battleLog === "function") {
          W.battleLog(
            target?.name
              ? target.name + "は眠っていない！ ゆめくいは失敗した！"
              : "相手は眠っていない！ ゆめくいは失敗した！"
          );
        }
        // executeAction treats true as an intercepted move and skips damage,
        // drain healing, secondary effects, and all later hit processing.
        return true;
      }
      return originalAbilityTriggerOnMove.apply(this, arguments);
    };
  } else {
    console.error("[v37] abilityTriggerOnMove hook is unavailable; Dream Eater guard not installed.");
  }

  W.PokemonChampions2DShowdownRules = {
    version: 37,
    isDreamEater,
    isComatose,
    dreamEaterCanHit,
    audit: () => ({
      version: 37,
      dreamEaterHook: typeof W.abilityTriggerOnMove === "function",
      asleepTargetAllowed: dreamEaterCanHit({ status: "slp" }),
      awakeTargetBlocked: !dreamEaterCanHit({ status: null }),
      comatoseTargetAllowed: dreamEaterCanHit({ status: null, abilityId: "comatose" })
    })
  };

  console.info("[v37] Dream Eater sleep requirements aligned with Showdown.");
})();