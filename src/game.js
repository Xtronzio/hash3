export const key = (x, y) => `${x},${y}`;
export function rankedPlayers(players) {
  return [...players].sort((a, b) => b.score - a.score || a.order - b.order);
}
export function immediateAbove(players, uid) {
  const list = rankedPlayers(players), index = list.findIndex(p => p.id === uid);
  return index > 0 ? list[index - 1] : null;
}
export function lineWindows(cells, x, y, symbol) {
  const occupied = new Map(cells.map(c => [key(c.x, c.y), c.symbol]));
  const lines = [];
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    for (let offset = -2; offset <= 0; offset++) {
      const sx = x + offset * dx, sy = y + offset * dy;
      if ([0, 1, 2].every(n => occupied.get(key(sx + dx * n, sy + dy * n)) === symbol)) {
        lines.push(`${symbol}:${sx},${sy}:${dx},${dy}`);
      }
    }
  }
  return lines;
}
export function connectedBlocks(blocks, active) {
  const known = new Map(blocks.map(b => [key(b.x, b.y), b])), visited = new Set(), queue = [active];
  for (let i = 0; i < queue.length; i++) {
    const b = queue[i], k = key(b.x, b.y);
    if (!known.has(k) || visited.has(k)) continue;
    visited.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({x: b.x + dx, y: b.y + dy});
  }
  return blocks.filter(b => visited.has(key(b.x, b.y)));
}
export function expansionOptions(blocks, active) {
  const known = new Set(blocks.map(b => key(b.x, b.y))), choices = new Map();
  for (const b of connectedBlocks(blocks, active)) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p = {x: b.x + dx, y: b.y + dy};
      if (!known.has(key(p.x, p.y))) choices.set(key(p.x, p.y), p);
    }
  }
  const values = [...choices.values()];
  const distance = b => Math.abs(b.x - active.x) + Math.abs(b.y - active.y);
  const nearest = Math.min(...values.map(distance));
  return values.filter(b => distance(b) === nearest);
}
