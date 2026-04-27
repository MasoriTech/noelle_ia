// Noelle V17.7 - behaviors robustos para items.
// A maioria dos items usa apenas slot/transform. Behavior só para itens com ação especial.

const FALLBACK_BEHAVIORS = {
  agua: { onEquip: { playMotion: "006_drinkwater", expression: "happy", delayMs: 180 } },
  cafe: { onEquip: { expression: "happy" } },
  iphone_14_pro: { onEquip: { playMotion: "005_smartphone", delayMs: 120 } },
  microfone: { onEquip: { expression: "happy" } },
  acoustic_guitar_black: { onEquip: { expression: "happy" } },
  basketball: { onEquip: { expression: "happy" } }
};

function itemBehavior(item = {}) {
  return item.behavior || FALLBACK_BEHAVIORS[item.id] || {};
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
}

export function getItemBehavior(item = {}) {
  return itemBehavior(item);
}

export function getRecommendedMotionForItem(item = {}) {
  const behavior = itemBehavior(item);
  return behavior?.onEquip?.playMotion || item.recommendedMotion || null;
}

export async function runItemBehavior(item, slot, api = {}) {
  const behavior = itemBehavior(item);
  const onEquip = behavior?.onEquip || {};
  const results = [];

  if (onEquip.expression && typeof api.showExpression === "function") {
    try {
      await api.showExpression(onEquip.expression);
      results.push({ ok: true, type: "expression", value: onEquip.expression });
    } catch (err) {
      results.push({ ok: false, type: "expression", error: String(err?.message || err) });
    }
  }

  if (onEquip.delayMs) await wait(onEquip.delayMs);

  if (onEquip.playMotion && typeof api.playMotion === "function") {
    try {
      await api.playMotion(onEquip.playMotion);
      results.push({ ok: true, type: "motion", value: onEquip.playMotion });
    } catch (err) {
      results.push({ ok: false, type: "motion", error: String(err?.message || err) });
    }
  }

  if (typeof api.setStatus === "function") {
    const readable = item.label || item.id || "Item";
    if (onEquip.playMotion) api.setStatus(`${readable} equipado · motion ${onEquip.playMotion}`);
    else api.setStatus(`${readable} equipado em ${slot}`);
  }

  return { ok: results.every((r) => r.ok !== false), results };
}
