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
  // Direction « terrain tropical » — mode clair.
  ['texte sur surface', '#1a1712', '#fffdf8', 4.5],
  ['texte attenue sur surface', '#57503f', '#fffdf8', 4.5],
  ['texte sur fond', '#1a1712', '#f6f1e7', 4.5],
  ['texte attenue sur fond', '#57503f', '#f6f1e7', 4.5],
  ['blanc sur primaire', '#ffffff', '#14532d', 4.5],
  ['accent terre sur surface', '#9c4407', '#fffdf8', 4.5],
  ['accent terre sur fond', '#9c4407', '#f6f1e7', 4.5],
  ['erreur sur surface', '#a51c1c', '#fffdf8', 4.5],
  ['succes sur surface', '#166534', '#fffdf8', 4.5],
  ['NOUVEAU', '#1e3a8a', '#eff6ff', 4.5],
  ['VALIDE', '#5b21b6', '#f5f3ff', 4.5],
  ['EN_COURS', '#92400e', '#fef3c7', 4.5],
  ['RESOLU', '#14532d', '#dcfce7', 4.5],
  ['REJETE', '#991b1b', '#fee2e2', 4.5],
  ['ROUVERT', '#9a3412', '#ffedd5', 4.5],
  ['priorite BASSE', '#3f3a2f', '#efe7d8', 4.5],
  ['priorite NORMALE', '#0c4a6e', '#e0f2fe', 4.5],
  ['priorite HAUTE', '#92400e', '#fef3c7', 4.5],
  ['priorite URGENTE', '#991b1b', '#fee2e2', 4.5],
  ['focus sur surface (3:1 non textuel)', '#14532d', '#fffdf8', 3],

  // Mode sombre — mêmes exigences.
  ['sombre texte sur surface', '#f0ece3', '#16211b', 4.5],
  ['sombre texte attenue sur surface', '#b3aa99', '#16211b', 4.5],
  ['sombre texte sur fond', '#f0ece3', '#0d1512', 4.5],
  ['sombre texte attenue sur fond', '#b3aa99', '#0d1512', 4.5],
  ['sombre sur-primaire sur primaire', '#052e16', '#4ade80', 4.5],
  ['sombre primaire sur surface (lien)', '#4ade80', '#16211b', 4.5],
  ['sombre accent sur surface', '#fbbf24', '#16211b', 4.5],
  ['sombre focus sur fond (3:1 non textuel)', '#4ade80', '#0d1512', 3],
];

let echecs = 0;
for (const [nom, texte, fond, minimum] of PAIRES) {
  const ratio = contraste(texte, fond);
  const ok = ratio >= minimum;
  if (!ok) echecs += 1;
  console.log(`${ok ? 'OK ' : 'ECHEC'} ${nom.padEnd(34)} ${String(ratio).padStart(5)} (min ${minimum})`);
}
console.log(`PAIRES=${PAIRES.length} ECHECS=${echecs}`);
if (echecs > 0) {
  console.error(`${echecs} paire(s) sous le minimum WCAG.`);
  process.exit(1);
}
process.exit(0);
