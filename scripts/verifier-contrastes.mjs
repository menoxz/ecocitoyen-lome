// Vérification WCAG des paires de couleurs du design system (aucune affirmation à l'oeil).
function canal(valeur) {
  const v = valeur / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const propre = hex.replace('#', '');
  const r = parseInt(propre.slice(0, 2), 16);
  const g = parseInt(propre.slice(2, 4), 16);
  const b = parseInt(propre.slice(4, 6), 16);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const clair = Math.max(la, lb);
  const sombre = Math.min(la, lb);
  return Math.round(((clair + 0.05) / (sombre + 0.05)) * 100) / 100;
}

const PAIRES = [
  ['texte sur surface', '#111827', '#ffffff', 4.5],
  ['texte attenue sur surface', '#4b5563', '#ffffff', 4.5],
  ['texte sur surface-alt', '#111827', '#f6f7f9', 4.5],
  ['blanc sur primaire', '#ffffff', '#0f766e', 4.5],
  ['NOUVEAU', '#1d4ed8', '#eff6ff', 4.5],
  ['VALIDE', '#6d28d9', '#f5f3ff', 4.5],
  ['EN_COURS', '#b45309', '#fffbeb', 4.5],
  ['RESOLU', '#15803d', '#f0fdf4', 4.5],
  ['REJETE', '#b91c1c', '#fef2f2', 4.5],
  ['ROUVERT', '#c2410c', '#fff7ed', 4.5],
  ['priorite BASSE', '#374151', '#f3f4f6', 4.5],
  ['priorite NORMALE', '#0369a1', '#e0f2fe', 4.5],
  ['priorite HAUTE', '#92400e', '#fef3c7', 4.5],
  ['priorite URGENTE', '#991b1b', '#fee2e2', 4.5],
  ['erreur sur surface', '#b91c1c', '#ffffff', 4.5],
  ['succes sur surface', '#15803d', '#ffffff', 4.5],
  ['bordure focus (3:1 non textuel)', '#0f766e', '#ffffff', 3],
];

let echecs = 0;
for (const [nom, texte, fond, minimum] of PAIRES) {
  const ratio = contraste(texte, fond);
  const ok = ratio >= minimum;
  if (!ok) echecs += 1;
  console.log(`${ok ? 'OK ' : 'ECHEC'} ${nom.padEnd(34)} ${String(ratio).padStart(5)} (min ${minimum})`);
}
console.log(`PAIRES=${PAIRES.length} ECHECS=${echecs}`);
