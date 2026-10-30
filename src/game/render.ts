import { HOME, WORLD, type GameState } from './engine';

const C = {
  grass: '#e0e7b9', grassLight: '#e8edc9', grassDark: '#c6d39b',
  path: '#f1e3bc', pathEdge: '#ddcfaa', ink: '#4a4432', leaf: '#6c8d50',
  leafLight: '#93ad66', leafDark: '#526f43', cream: '#fff6df', orange: '#c8583e',
};
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); ctx.fill();
}
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function line(ctx: CanvasRenderingContext2D, points: number[], color: string, width: number) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.stroke();
}
function flower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = 3) {
  for (let a = 0; a < 5; a++) ellipse(ctx, x + Math.cos(a * Math.PI * .4) * size, y + Math.sin(a * Math.PI * .4) * size, size * .85, size * .85, color);
  ellipse(ctx, x, y, size * .6, size * .6, '#b99140');
}
function shrub(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ellipse(ctx, x, y + 10, size * 1.2, size * .4, '#bdcb94');
  ellipse(ctx, x - size * .5, y, size * .7, size * .8, C.leaf);
  ellipse(ctx, x + size * .5, y + 2, size * .75, size * .7, C.leafLight);
  ellipse(ctx, x, y - size * .35, size * .8, size * .9, '#839f5c');
  line(ctx, [x, y + size * .55, x + 2, y - size * .45], '#749052', 2);
  ellipse(ctx, x - size * .24, y - size * .5, 3, 6, '#a8bc7d', -.5);
}
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ellipse(ctx, x + 4, y + 28, size * .95, 16, '#bfcd98');
  round(ctx, x - 6, y - 5, 12, 36, 3, '#9e8054');
  ellipse(ctx, x - size * .4, y - 12, size * .7, size * .7, C.leaf);
  ellipse(ctx, x + size * .38, y - 16, size * .7, size * .8, '#819c5a');
  ellipse(ctx, x, y - size * .55, size * .78, size * .8, '#96af6a');
  ellipse(ctx, x - size * .25, y - size * .8, size * .35, size * .2, '#abc17e', -.4);
  for (const [dx, dy] of [[-15, -15], [16, -23], [3, 0]]) ellipse(ctx, x + dx, y + dy, 4, 4, '#d4a45e');
}
function fence(ctx: CanvasRenderingContext2D, x: number, y: number, count: number) {
  round(ctx, x, y + 4, count * 18, 5, 2, '#c6b28a');
  round(ctx, x, y + 18, count * 18, 5, 2, '#c6b28a');
  for (let i = 0; i <= count; i++) {
    round(ctx, x + i * 18, y, 7, 31, 2, '#e8dabb');
    ctx.fillStyle = '#e8dabb'; ctx.beginPath(); ctx.moveTo(x + i * 18, y); ctx.lineTo(x + i * 18 + 3.5, y - 5); ctx.lineTo(x + i * 18 + 7, y); ctx.fill();
  }
}
function house(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 403, 279, 79, 27, '#c4cc98');
  // A little warm porch, striped roof, and a sunflower by the door.
  round(ctx, 344, 267, 113, 38, 14, '#e5d5aa');
  round(ctx, 353, 209, 95, 73, 5, '#fff4d6');
  round(ctx, 427, 174, 12, 30, 2, '#ae5a43');
  ctx.fillStyle = '#bd6044'; ctx.beginPath(); ctx.moveTo(336, 218); ctx.lineTo(400, 166); ctx.quadraticCurveTo(403, 163, 407, 167); ctx.lineTo(464, 218); ctx.closePath(); ctx.fill();
  line(ctx, [337, 219, 400, 168, 463, 219], '#954a36', 5);
  for (let i = 0; i < 4; i++) line(ctx, [358 + i * 11, 208 - i * 9, 373 + i * 17, 218], '#cb7654', 2);
  round(ctx, 386, 239, 29, 43, 13, '#7a8e60');
  round(ctx, 389, 242, 23, 40, 10, '#91a471');
  ellipse(ctx, 406, 262, 2.2, 2.2, '#fff0c7');
  for (const x of [365, 426]) {
    round(ctx, x, 235, 14, 18, 3, '#dabd76');
    line(ctx, [x + 7, 236, x + 7, 252], '#fff6df', 2);
    line(ctx, [x + 1, 244, x + 13, 244], '#fff6df', 2);
  }
  line(ctx, [448, 274, 448, 244], C.leaf, 3);
  flower(ctx, 448, 242, '#dfb347', 5);
  ellipse(ctx, 454, 261, 8, 4, C.leaf, -.6);
  round(ctx, 380, 285, 43, 6, 3, '#d0bd91');
  ctx.font = '600 12px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#5d6546';
  ctx.fillText('Home', HOME.x, 322);
  line(ctx, [390, 331, 400, 336, 410, 331], '#899a64', 2);
}
export function makeScenery(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = WORLD.width * 2; canvas.height = WORLD.height * 2;
  const ctx = canvas.getContext('2d')!; ctx.scale(2, 2);
  ctx.fillStyle = C.grass; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // Stable, hand-drawn meadow texture. No decorative motion runs before play.
  let seed = 46; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1050; i++) {
    const x = rand() * 800, y = rand() * 520;
    if (i % 5 === 0) line(ctx, [x - 2, y + 2, x - 1, y - 2, x + 1, y + 2, x + 3, y - 1], '#c8d59f', 1);
    else ellipse(ctx, x, y, 1.2, 1.2, i % 2 ? '#cdd9aa' : '#e9edce');
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-15, 296); ctx.bezierCurveTo(124, 301, 115, 181, 258, 211);
  ctx.bezierCurveTo(368, 241, 325, 376, 468, 365); ctx.bezierCurveTo(612, 354, 551, 202, 677, 234); ctx.bezierCurveTo(750, 250, 742, 301, 825, 287);
  ctx.strokeStyle = C.pathEdge; ctx.lineWidth = 61; ctx.stroke(); ctx.strokeStyle = C.path; ctx.lineWidth = 57; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(393, 285); ctx.quadraticCurveTo(402, 314, 417, 353); ctx.strokeStyle = C.path; ctx.lineWidth = 40; ctx.stroke();
  for (const [x, y] of [[153, 257], [269, 228], [353, 314], [472, 379], [624, 261], [713, 278]]) {
    ellipse(ctx, x, y, 2, 1.5, '#d9c798'); ellipse(ctx, x + 8, y - 8, 1.2, 1, '#d9c798');
  }
  fence(ctx, 33, 44, 7); fence(ctx, 615, 45, 8); fence(ctx, 12, 457, 6); fence(ctx, 630, 462, 8);
  for (const [x, y, s] of [[43, 111, 30], [753, 117, 34], [73, 423, 28], [744, 434, 32], [473, 34, 21]]) tree(ctx, x, y, s);
  for (const [x, y, s] of [[125, 55, 22], [692, 58, 25], [25, 365, 23], [775, 365, 24], [285, 474, 20], [596, 475, 18]]) shrub(ctx, x, y, s);
  for (let i = 0; i < 48; i++) {
    const x = 35 + rand() * 730, y = 30 + rand() * 465;
    if (Math.hypot(x - HOME.x, y - 260) > 120) flower(ctx, x, y, i % 3 ? '#fcf6d8' : '#ce8760', 2.2);
  }
  // Garden beds at the edges.
  round(ctx, 291, 34, 58, 27, 8, '#c6bb8b');
  for (let i = 0; i < 4; i++) {
    line(ctx, [302 + i * 12, 52, 302 + i * 12, 42], '#6c884d', 2);
    ellipse(ctx, 298 + i * 12, 42, 5, 2.5, '#7c9953', .5); ellipse(ctx, 305 + i * 12, 39, 5, 2.5, '#7c9953', -.8);
  }
  house(ctx);
  // The route sign is artwork, not essential UI.
  line(ctx, [78, 187, 78, 212], '#aa8e60', 4);
  round(ctx, 51, 172, 56, 22, 4, '#f8edcf');
  ctx.fillStyle = '#716448'; ctx.font = '600 10px "DM Sans", sans-serif'; ctx.fillText('Seed lane', 79, 187);
  return canvas;
}
export function drawGame(ctx: CanvasRenderingContext2D, state: GameState,
  scenery: HTMLCanvasElement, reducedMotion: boolean) {
  const sx = ctx.canvas.width / WORLD.width, sy = ctx.canvas.height / WORLD.height;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  ctx.drawImage(scenery, 0, 0, WORLD.width, WORLD.height);
  for (const rock of state.rocks) {
    ellipse(ctx, rock.x + 2, rock.y + 13, 24, 9, '#bfca9b');
    ctx.fillStyle = '#9ba18c'; ctx.beginPath(); ctx.moveTo(rock.x - 22, rock.y + 7);
    ctx.lineTo(rock.x - 17, rock.y - 12); ctx.lineTo(rock.x - 4, rock.y - 21); ctx.lineTo(rock.x + 13, rock.y - 17);
    ctx.lineTo(rock.x + 23, rock.y + 5); ctx.quadraticCurveTo(rock.x + 2, rock.y + 19, rock.x - 22, rock.y + 7); ctx.fill();
    ctx.fillStyle = '#b8bca5'; ctx.beginPath(); ctx.moveTo(rock.x - 17, rock.y - 12); ctx.lineTo(rock.x - 4, rock.y - 21); ctx.lineTo(rock.x + 13, rock.y - 17); ctx.lineTo(rock.x + 3, rock.y - 4); ctx.fill();
    line(ctx, [rock.x + 3, rock.y - 4, rock.x + 10, rock.y + 5], '#8c9480', 1.5);
  }
  for (const seed of state.seeds) {
    ellipse(ctx, seed.x, seed.y + 9, 12, 4.5, '#c1cc97');
    ctx.save(); ctx.translate(seed.x, seed.y); ctx.rotate(seed.angle);
    ctx.fillStyle = '#b67b2c'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.bezierCurveTo(15, 0, 11, 13, 0, 14); ctx.bezierCurveTo(-11, 13, -15, 0, 0, -14); ctx.fill();
    ctx.fillStyle = '#f1c95e'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.bezierCurveTo(11, 0, 8, 11, 0, 12); ctx.bezierCurveTo(-8, 11, -11, 0, 0, -12); ctx.fill();
    line(ctx, [0, -7, 0, 7], '#fff0aa', 2); ctx.restore();
  }
  if (!reducedMotion) for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / .65);
    ellipse(ctx, p.x, p.y, 3, 2, p.kind === 'seed' ? '#d4a43e' : '#71874c');
  }
  ctx.globalAlpha = 1;
  const p = state.player;
  const bob = p.walking && !reducedMotion ? Math.sin(state.elapsed * 24) * 1.5 : 0;
  ctx.save(); ctx.translate(p.x, p.y + bob);
  ellipse(ctx, 0, 20, 29, 9, '#aebd8a');
  if (state.invulnerable > 0) {
    ctx.strokeStyle = '#b45034'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 2, 30, 30, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.scale(p.facing, 1);
  // Satchel, little feet, round ears and cream cheeks.
  ellipse(ctx, -9, 19, 9, 5, '#986745'); ellipse(ctx, 10, 19, 9, 5, '#986745');
  round(ctx, -24, -1, 17, 23, 5, '#b0743a');
  round(ctx, -26, -4, 21, 11, 4, '#d4a254');
  line(ctx, [-22, 8, -10, 8], '#956433', 1.5);
  ellipse(ctx, 1, 0, 23, 23, '#d7aa70');
  ellipse(ctx, -14, -19, 8, 10, '#c79865', -.2); ellipse(ctx, 16, -19, 8, 10, '#c79865', .2);
  ellipse(ctx, -14, -20, 4.5, 6, '#e8bea0', -.2); ellipse(ctx, 16, -20, 4.5, 6, '#e8bea0', .2);
  ellipse(ctx, 3, 7, 17, 15, '#fff0d1');
  ellipse(ctx, -5, -3, 2.8, 3.8, '#3e3a2d'); ellipse(ctx, 12, -3, 2.8, 3.8, '#3e3a2d');
  ellipse(ctx, -6, -4, 1, 1, '#fff9e8'); ellipse(ctx, 11, -4, 1, 1, '#fff9e8');
  ellipse(ctx, -10, 6, 5, 3, '#e7b497'); ellipse(ctx, 18, 6, 4, 3, '#e7b497');
  ellipse(ctx, 4, 4, 3.5, 2.5, '#a36f54');
  line(ctx, [4, 6, 4, 10, 1, 12], '#a36f54', 1.3);
  line(ctx, [4, 10, 7, 12], '#a36f54', 1.3);
  ctx.restore();
}
