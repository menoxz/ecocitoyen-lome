import { SignalementStatut, PrioriteNiveau, MotifRejet } from '../types/index.ts';

export const STATUS_CONFIG: Record<SignalementStatut, { label: string; bg: string; text: string; border: string }> = {
  NOUVEAU: {
    label: 'Nouveau',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  VALIDE: {
    label: 'Validé',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  EN_COURS: {
    label: 'En cours',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  RESOLU: {
    label: 'Résolu',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200'
  },
  REJETE: {
    label: 'Rejeté',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200'
  },
  ROUVERT: {
    label: 'Rouvert',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200'
  }
};

export const PRIORITY_CONFIG: Record<PrioriteNiveau, { label: string; bg: string; text: string; border: string; delayMax: string }> = {
  BASSE: {
    label: 'Basse',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    delayMax: '30 jours'
  },
  NORMALE: {
    label: 'Normale',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-300',
    delayMax: '14 jours'
  },
  HAUTE: {
    label: 'Haute',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-300',
    delayMax: '7 jours'
  },
  URGENTE: {
    label: 'Urgente',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    delayMax: '72 heures'
  }
};

export const MOTIFS_REJET: MotifRejet[] = [
  'Doublon',
  'Hors zone',
  'Hors périmètre',
  'Informations insuffisantes',
  'Contenu inapproprié',
  'Signalement abusif',
  'Autre'
];

export function formatDate(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('fr-TG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    }).format(d) + ' (UTC)';
  } catch {
    return isoStr;
  }
}

export function formatRelativeTime(isoStr?: string): string {
  if (!isoStr) return '';
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 3600));
  if (diffHours < 1) return 'Il y a quelques instants';
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
}

// Client-side image compression using canvas (ENF02: Photos réduites à < 1 Mo avant envoi)
export function compressImageFile(file: File, maxDim = 1200, quality = 0.82): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        // Draw image (stripping EXIF metadata by default as canvas re-encodes)
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Estimate size from base64 length
        const size = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, size });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
