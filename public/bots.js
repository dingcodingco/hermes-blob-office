// Blob Office 봇 그리기 공용 코드. 스타일(style)만 바꿔서 여러 시안을 만든다.
const LOOP = 2400;

const SHAPES = {
  dome:   (f, s) => `<path d="M22 176 A78 78 0 0 1 178 176 Z" fill="${f}" ${s}/>`,
  tri:    (f, s, w = 22, sc = f) => `<polygon points="100,52 166,166 34,166" fill="${f}" stroke="${sc}" stroke-width="${w}" stroke-linejoin="round" ${s}/>`,
  cloud:  (f, s) => `<g fill="${f}" ${s}><circle cx="70" cy="128" r="46"/><circle cx="112" cy="102" r="54"/><circle cx="150" cy="134" r="40"/><rect x="40" y="120" width="134" height="56" rx="28"/></g>`,
  drop:   (f, s) => `<path d="M100 34 C118 62 162 104 162 128 A62 50 0 0 1 38 128 C38 104 82 62 100 34Z" fill="${f}" ${s}/>`,
  square: (f, s) => `<rect x="38" y="52" width="124" height="124" rx="46" fill="${f}" ${s}/>`,
  clover: (f, s) => `<g fill="${f}" ${s}><circle cx="74" cy="92" r="38"/><circle cx="126" cy="92" r="38"/><circle cx="74" cy="138" r="38"/><circle cx="126" cy="138" r="38"/><circle cx="100" cy="115" r="40"/></g>`,
};
const FACE = { dome:[100,128], tri:[100,128], cloud:[108,128], drop:[100,122], square:[100,112], clover:[100,112] };
// 하이라이트 위치(입체 시안용)
const SHINE = { dome:[70,118], tri:[84,100], cloud:[90,82], drop:[80,92], square:[68,80], clover:[62,78] };

const BOTS = [
  { id:"ops",  name:"모아", role:"운영 · 팀장",   shape:"dome",   color:"#f4f4f5", eye:"#111", acc:"crown" },
  { id:"sales",name:"부릉", role:"영업",         shape:"square", color:"#ff7a1a", eye:"#fff", acc:"tie" },
  { id:"cont", name:"핑키", role:"콘텐츠",       shape:"tri",    color:"#ff2d87", eye:"#fff", acc:"beret" },
  { id:"rsch", name:"구름", role:"리서치",       shape:"cloud",  color:"#2f6bff", eye:"#fff", acc:"glasses" },
  { id:"sec",  name:"초롱", role:"비서",         shape:"drop",   color:"#16c26b", eye:"#fff", acc:"headset" },
  { id:"new",  name:"클로", role:"새로 온 봇",    shape:"clover", color:"#14b8a6", eye:"#fff", acc:"sprout" },
];

function shade(hex, k) { // k>0 밝게, k<0 어둡게
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function accessory(b, ink, gl = ink) {
  const [fx, fy] = FACE[b.shape];
  if (globalThis.EXTRA_ACC && globalThis.EXTRA_ACC[b.acc]) return globalThis.EXTRA_ACC[b.acc](b, ink);
  switch (b.acc) {
    case "crown":   return `<path d="M78 92 l8 -18 l14 12 l14 -12 l8 18 Z" fill="#ffc83d" stroke="#ffc83d" stroke-width="4" stroke-linejoin="round"/>`;
    case "tie":     return `<path d="M100 150 l-14 -8 v16 Z M100 150 l14 -8 v16 Z" fill="${ink}"/><circle cx="100" cy="150" r="4" fill="${ink}"/>`;
    case "beret":   return `<path d="M70 70 Q100 40 132 66 Q104 74 70 70Z" fill="${ink}"/><circle cx="104" cy="50" r="4" fill="${ink}"/>`;
    case "glasses": return `<g fill="none" stroke="${gl}" stroke-width="5"><circle cx="${fx-17}" cy="${fy}" r="17"/><circle cx="${fx+17}" cy="${fy}" r="17"/></g>`;
    case "headset": return `<path d="M58 118 Q60 60 100 58 Q140 60 142 118" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><rect x="50" y="112" width="14" height="24" rx="6" fill="${ink}"/><rect x="136" y="112" width="14" height="24" rx="6" fill="${ink}"/><path d="M57 134 Q64 156 86 154" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
    case "sprout":  return `<path d="M100 56 v-16" stroke="${ink}" stroke-width="5" stroke-linecap="round"/><ellipse cx="90" cy="38" rx="10" ry="6" fill="#16c26b" transform="rotate(-25 90 38)"/><ellipse cx="110" cy="36" rx="10" ry="6" fill="#16c26b" transform="rotate(25 110 36)"/>`;
  }
  return "";
}

const hop = (x, a, b) => (x < a || x > b) ? 0 : Math.sin(Math.PI * (x - a) / (b - a));

function pose(state, t, seed) {
  const p = { y:0, sx:1, sy:1, rot:0, eye:{ dx:0, dy:0, h:34, w:15, tilt:-12, open:1, kind:"pill", r:1 }, fx:"" };
  const br = Math.sin(2 * Math.PI * (t + seed));
  switch (state) {
    case "idle": { p.sy = 1 + 0.035*br; p.sx = 1 - 0.025*br; const bl = (t + seed*0.5) % 1; if (bl > 0.62 && bl < 0.68) p.eye.open = 0.12; p.eye.dx = 3*Math.sin(2*Math.PI*t); break; }
    case "work": { const h = hop((t*4)%1, 0, 0.5); p.y = -5*h; p.sy = 1 - 0.05*h; p.sx = 1 + 0.04*h; p.eye.h = 13; p.eye.w = 22; p.eye.tilt = 0; p.eye.dy = 6; p.eye.dx = 4 + 6*Math.sin(2*Math.PI*t); p.fx = "laptop"; break; }
    case "think": { p.rot = 8*Math.sin(2*Math.PI*t); p.eye.dx = -8; p.eye.dy = -10; p.eye.r = 0.75; p.fx = "dots"; if (t > 0.8 && t < 0.85) p.eye.open = 0.12; break; }
    case "talk": { const h = hop((t*3)%1, 0, 0.35); p.y = -8*h; p.sy = 1 + 0.06*h; p.sx = 1 - 0.05*h; p.eye.h = 42; p.eye.w = 17; p.eye.dx = 10; p.eye.tilt = -6; p.fx = "bubble"; break; }
    case "done": { const h = hop(t, 0.15, 0.6), land = hop(t, 0.6, 0.75), pre = hop(t, 0.02, 0.15); p.y = -34*h; p.sy = 1 + 0.10*h - 0.14*land - 0.12*pre; p.sx = 1 - 0.08*h + 0.14*land + 0.1*pre; p.eye.kind = "happy"; p.fx = h > 0.3 ? "spark" : ""; break; }
    case "error": { p.sy = 0.86 + 0.02*br; p.sx = 1.08; p.rot = 2.5*Math.sin(4*Math.PI*t); p.eye.kind = "sad"; p.fx = "sweat"; break; }
    case "walk": { const k = (t * 6) % 1, h = hop(k, 0, 0.78), land = hop(k, 0.78, 1); p.y = -16 * h; p.sy = 1 + 0.07 * h - 0.12 * land; p.sx = 1 - 0.05 * h + 0.1 * land; break; }
    case "sit": { p.sy = 1 + 0.02 * br; p.sx = 1 - 0.015 * br; const bl = (t + seed * 0.5) % 1; if (bl > 0.62 && bl < 0.67) p.eye.open = 0.12; break; }
    case "sleep": { p.sy = 1 + 0.05*br; p.sx = 1 - 0.035*br; p.eye.kind = "closed"; p.fx = "zz"; break; }
  }
  return p;
}

// eyeStyle: "pill"(그록봇식 비스듬한 알약) | "bead"(피클식 검은 타원 + 반짝임)
function eyesSVG(b, p, c, eyeStyle) {
  const [fx, fy] = FACE[b.shape], e = p.eye, gap = e.gap ?? 17, cx = fx + e.dx, cy = fy + e.dy;
  if (e.kind === "happy")  return [-gap, gap].map(o => `<path d="M${cx+o-11} ${cy+4} Q${cx+o} ${cy-14} ${cx+o+11} ${cy+4}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`).join("");
  if (e.kind === "closed") return [-gap, gap].map(o => `<path d="M${cx+o-10} ${cy+2} Q${cx+o} ${cy+9} ${cx+o+10} ${cy+2}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`).join("");
  if (e.kind === "sad")    return `<rect x="${cx-gap-6}" y="${cy-9}" width="12" height="22" rx="6" fill="${c}" transform="rotate(38 ${cx-gap} ${cy})"/><rect x="${cx+gap-6}" y="${cy-9}" width="12" height="22" rx="6" fill="${c}" transform="rotate(-38 ${cx+gap} ${cy})"/>`;
  const h0 = eyeStyle === "bead" ? e.h * 0.72 : e.h, w0 = eyeStyle === "bead" ? Math.max(e.w, 15) : e.w, tilt = eyeStyle === "bead" ? 0 : e.tilt;
  return [[-gap, 1], [gap, e.r]].map(([o, s]) => {
    const hh = Math.max(4, h0 * e.open * s), w = w0;
    const glint = eyeStyle === "bead" && hh > 12 ? `<circle cx="${cx+o+w*0.18}" cy="${cy-hh*0.22}" r="${w*0.17}" fill="#fff"/>` : "";
    return `<rect x="${cx+o-w/2}" y="${cy-hh/2}" width="${w}" height="${hh}" rx="${w/2}" fill="${c}" transform="rotate(${tilt} ${cx+o} ${cy})"/>${glint}`;
  }).join("");
}

function fxSVG(p, t, ink, soft) {
  switch (p.fx) {
    case "laptop": { if (globalThis.NO_LAPTOP) return ""; const k = (t*8)%1 < 0.5; return `<g transform="translate(100 178)"><path d="M-30 0 h60 l-6 -26 h-48Z" fill="#3a3a40"/><rect x="-36" y="-2" width="72" height="6" rx="3" fill="#55555c"/><circle cx="0" cy="-13" r="3" fill="${k?'#f4f4f5':'#8b8b93'}"/></g>`; }
    case "dots":   return [0,1,2].map(i => `<circle cx="${150+i*12}" cy="${48-i*6}" r="${4+i*1.5}" fill="${soft}" opacity="${(Math.floor(t*6)%3)>=i?1:0.3}"/>`).join("");
    case "bubble": return `<g transform="translate(140 34)"><rect x="0" y="0" width="38" height="24" rx="12" fill="${ink === '#111' ? '#fff' : '#f4f4f5'}" stroke="${ink==='#111'?'#111':'none'}" stroke-width="2"/>${[0,1,2].map(i=>`<circle cx="${11+i*8}" cy="12" r="2.6" fill="#111" opacity="${(Math.floor(t*9)%3)===i?1:0.3}"/>`).join("")}</g>`;
    case "spark":  return `<g fill="#ffc83d">${[[34,40],[166,52],[150,22]].map(([x,y])=>`<path d="M${x} ${y-9} L${x+3} ${y-3} L${x+9} ${y} L${x+3} ${y+3} L${x} ${y+9} L${x-3} ${y+3} L${x-9} ${y} L${x-3} ${y-3}Z"/>`).join("")}</g>`;
    case "sweat":  { const d = (t*2)%1; return `<path d="M150 ${70+d*14} q6 10 0 14 q-6 -4 0 -14Z" fill="#7cc4ff" opacity="${1-d*0.6}"/>`; }
    case "zz":     { const a = t, b2 = (t+0.5)%1; return `<g fill="${soft}" font-family="Inter,sans-serif" font-weight="700"><text x="${146+a*8}" y="${66-a*22}" font-size="18" opacity="${1-a}">z</text><text x="${160+b2*8}" y="${56-b2*22}" font-size="13" opacity="${1-b2}">z</text></g>`; }
  }
  return "";
}

// style: flat | clay | felt | sticker
function botSVG(b, state, t, seed, style, uid, opts = {}) {
  const p = pose(state, t, seed);
  const turn = opts.turn || 0;
  // 몸을 돌리면 눈이 옆으로 몰리고 간격이 좁아져 입체로 도는 것처럼 보인다
  p.eye.dx += turn * 16 + (opts.lookX || 0); p.eye.dy += (opts.lookY || 0);
  p.eye.gap = 17 - Math.abs(turn) * 5;
  p.sx *= 1 - 0.08 * Math.abs(turn);
  p.rot += (opts.lean || 0);
  const tf = `translate(0 ${p.y}) translate(100 176) rotate(${p.rot}) scale(${p.sx} ${p.sy}) translate(-100 -176)`;
  const sk = 1 - Math.min(0.5, -p.y / 60);
  let defs = "", fill = b.color, attr = "", eyeC = b.eye, eyeStyle = "pill", ink = "#111", soft = "#8b8b93", extra = "", shadowOp = 0.45, shadowC = "#000";
  const id = `${uid}-${b.id}`;
  if (style === "clay") {
    defs = `<radialGradient id="g${id}" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(b.color, 0.35)}"/><stop offset="0.55" stop-color="${b.color}"/><stop offset="1" stop-color="${shade(b.color, -0.35)}"/></radialGradient><filter id="s${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`;
    fill = `url(#g${id})`; eyeC = "#1d1b22"; eyeStyle = "bead"; shadowOp = 0.22; shadowC = "#6b5a3e";
    const [sx, sy] = SHINE[b.shape];
    extra = `<ellipse cx="${sx}" cy="${sy}" rx="16" ry="9" fill="#fff" opacity="0.45" transform="rotate(-30 ${sx} ${sy})" filter="url(#s${id})"/>`;
  }
  if (style === "felt") {
    defs = `<filter id="f${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" result="n2"/><feColorMatrix in="n2" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0" result="w"/><feComposite in="w" in2="d" operator="in" result="wt"/><feMerge><feMergeNode in="d"/><feMergeNode in="wt"/></feMerge></filter><radialGradient id="g${id}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${shade(b.color, 0.15)}"/><stop offset="1" stop-color="${shade(b.color, -0.2)}"/></radialGradient>`;
    fill = `url(#g${id})`; attr = `filter="url(#f${id})"`; eyeC = "#111"; eyeStyle = "bead"; shadowOp = 0.18;
  }
  if (style === "sticker") {
    defs = `<filter id="k${id}" x="-30%" y="-30%" width="160%" height="160%"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="o"/><feFlood flood-color="#fff"/><feComposite in2="o" operator="in" result="w"/><feOffset in="o" dx="6" dy="7" result="so"/><feFlood flood-color="#111"/><feComposite in2="so" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    eyeC = "#111"; shadowOp = 0;
  }
  if (style === "soft") { // 흰 테두리 + 부드러운 그림자(스티커를 차분하게)
    defs = `<filter id="k${id}" x="-30%" y="-30%" width="160%" height="170%"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="o"/><feFlood flood-color="#fff"/><feComposite in2="o" operator="in" result="w"/><feGaussianBlur in="o" stdDeviation="7" result="bl"/><feOffset in="bl" dx="0" dy="9" result="so"/><feFlood flood-color="#0b0b20" flood-opacity="0.28"/><feComposite in2="so" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    eyeC = "#111"; shadowOp = 0;
  }
  if (style === "m1") { // M1 배경과 같은 처리: 흰 테두리 + 얇은 진회색 선 + 부드러운 그림자
    defs = `<filter id="k${id}" x="-30%" y="-30%" width="160%" height="170%"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="o"/><feMorphology in="SourceAlpha" operator="dilate" radius="10" result="o2"/><feFlood flood-color="#3d3733"/><feComposite in2="o2" operator="in" result="ln"/><feFlood flood-color="#fff"/><feComposite in2="o" operator="in" result="w"/><feGaussianBlur in="o2" stdDeviation="5" result="bl"/><feOffset in="bl" dx="3" dy="8" result="so"/><feFlood flood-color="#3d3733" flood-opacity="0.35"/><feComposite in2="so" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="ln"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    eyeC = "#1d1b22"; shadowOp = 0;
  }
  if (b.color === "#f4f4f5" && style !== "flat") eyeC = "#1d1b22";
  let body = SHAPES[b.shape](fill, attr);
  if (style === "m1fast") { // M1 look without filters: dark rim + white rim drawn as strokes under the body (fast to animate)
    const rim = (c, w) => b.shape === "tri" ? SHAPES.tri(c, "", 22 + w, c) : SHAPES[b.shape](c, `stroke="${c}" stroke-width="${w}" stroke-linejoin="round"`);
    body = rim("#3d3733", 21) + rim("#fff", 14) + body;
    eyeC = "#1d1b22"; shadowOp = 0;
  }
  const inner = `${body}${extra}${eyesSVG(b, p, eyeC, eyeStyle)}${accessory(b, ink, style === "flat" ? ink : "#fff")}`;
  const group = (style === "sticker" || style === "soft" || style === "m1") ? `<g filter="url(#k${id})">${inner}</g>` : inner;
  return `<defs>${defs}</defs><ellipse cx="100" cy="180" rx="${58*sk}" ry="${7*sk}" fill="${shadowC}" opacity="${shadowOp}"/><g transform="${tf}">${group}</g>${fxSVG(p, t, style === "flat" ? "#fff" : "#111", soft)}`;
}
