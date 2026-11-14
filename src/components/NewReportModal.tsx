import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ThumbsUp, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Trash2, 
  HelpCircle,
  Navigation
} from 'lucide-react';
import { Categorie, Quartier, Signalement } from '../types/index.ts';
import { compressImageFile } from '../utils/helpers.ts';
import { COMMUNE_LOME } from '../data/initialData.ts';

interface NewReportModalProps {
  categories: Categorie[];
  quartiers: Quartier[];
  initialLat?: number;
  initialLon?: number;
  onClose: () => void;
  onSubmitSuccess: (newReport: Signalement) => void;
  onConfirmExistingReport: (reportId: string) => void;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  categories,
  quartiers,
  initialLat,
  initialLon,
  onClose,
  onSubmitSuccess,
  onConfirmExistingReport
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [photos, setPhotos] = useState<{ url: string; mime: string; taille_octets: number }[]>([]);
  const [sansPhoto, setSansPhoto] = useState(false);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('');
  
  // IA State
  const [analyzingIA, setAnalyzingIA] = useState(false);
  const [iaResult, setIaResult] = useState<{
    id_categorie: string;
    score: number;
    description: string;
    mode: 'MODELE' | 'SIMULATION';
  } | null>(null);

  // Location State
  const [latitude, setLatitude] = useState<number>(initialLat || 6.1370);
  const [longitude, setLongitude] = useState<number>(initialLon || 1.2150);
  const [accuracyMeters, setAccuracyMeters] = useState<number>(10);
  const [repere, setRepere] = useState('');
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Duplicates State
  const [nearbyDuplicates, setNearbyDuplicates] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Description & submission
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Photo selection & compression (ENF02)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      setErrorMsg('Maximum 3 photos autorisées par signalement.');
      return;
    }

    try {
      const newPhotos: { url: string; mime: string; taille_octets: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setErrorMsg(`Le fichier ${file.name} dépasse la limite autorisée de 5 Mo.`);
          return;
        }

        const compressed = await compressImageFile(file, 1200, 0.82);
        newPhotos.push({
          url: compressed.dataUrl,
          mime: 'image/jpeg',
          taille_octets: compressed.size
        });
      }

      const updated = [...photos, ...newPhotos];
      setPhotos(updated);
      setSansPhoto(false);
      setErrorMsg(null);

      // Automatically trigger AI classification on the primary photo (EF35)
      if (updated.length > 0) {
        triggerAIAnalysis(updated[0].url);
      }
    } catch (err: any) {
      setErrorMsg(`Erreur lors de la compression de la photo : ${err.message}`);
    }
  };

  // Trigger Gemini AI Image Classification
  const triggerAIAnalysis = async (imageBase64: string) => {
    setAnalyzingIA(true);
    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' })
      });
      const data = await res.json();
      if (res.ok && data.id_categorie) {
        setIaResult({
          id_categorie: data.id_categorie,
          score: data.score_confiance || 0.88,
          description: data.description_visuelle || '',
          mode: data.mode || 'MODELE'
        });

        // Preselect if reliable (score >= 0.80) per RG15
        if ((data.score_confiance || 0) >= 0.80) {
          setSelectedCategorie(data.id_categorie);
        }
      }
    } catch (err) {
      console.warn('AI analysis failed:', err);
    } finally {
      setAnalyzingIA(false);
    }
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }
    setLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        setAccuracyMeters(Math.round(pos.coords.accuracy));
        setLocatingGps(false);

        // Check if inside Lomé
        const inside = 
          lat >= COMMUNE_LOME.lat_min &&
          lat <= COMMUNE_LOME.lat_max &&
          lon >= COMMUNE_LOME.lon_min &&
          lon <= COMMUNE_LOME.lon_max;

        if (!inside) {
          setGpsError(`Votre position actuelle (${lat.toFixed(4)}, ${lon.toFixed(4)}) est située en dehors du Grand Lomé. Pour tester, vous pouvez repositionner le marqueur sur Lomé.`);
        } else {
          checkNearbyDuplicates(lat, lon);
        }
      },
      (err) => {
        setLocatingGps(false);
        setGpsError(`Impossible d'obtenir la position GPS (${err.message}). Veuillez pointer manuellement sur la carte.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check nearby duplicates (RG04)
  const checkNearbyDuplicates = async (lat: number, lon: number) => {
    setCheckingDuplicates(true);
    try {
      const res = await fetch(`/api/reports/check-duplicates?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNearbyDuplicates(data);
      }
    } catch {
      // Ignore
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Handle Submit (T0)
  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!sansPhoto && photos.length === 0) {
      setErrorMsg('Veuillez ajouter au moins une photo ou activer le mode dégradé.');
      setStep(1);
      return;
    }
    if (!selectedCategorie) {
      setErrorMsg('Veuillez sélectionner une catégorie de déchet.');
      setStep(1);
      return;
    }
    if (!description || description.trim().length < 10) {
      setErrorMsg('La description doit comporter au moins 10 caractères.');
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id_categorie: selectedCategorie,
        latitude,
        longitude,
        precision_gps_m: accuracyMeters,
        repere: repere.trim(),
        description: description.trim(),
        photos,
        sans_photo: sansPhoto,
        id_categorie_ia: iaResult?.id_categorie,
        score_ia: iaResult?.score,
        mode_ia: iaResult?.mode || 'AUCUN',
        justification_ia: iaResult?.description
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du signalement');
      }

      onSubmitSuccess(data.report);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Modal Header & Steps indicator */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Écran {step} sur 3
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              {step === 1 && '1. Photo et analyse IA du déchet'}
              {step === 2 && '2. Localisation précise à Lomé'}
              {step === 3 && '3. Description et confirmation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* STEP 1: PHOTO & IA */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Photo Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Photographie du problème {sansPhoto ? '(Désactivée en mode dégradé)' : '(1 à 3 photos)'}
                </label>

                {!sansPhoto && (
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative h-28 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={p.url} alt="Aperçu" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {photos.length < 3 && (
                      <label className="h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/30 transition cursor-pointer p-2 text-center">
                        <Camera className="w-6 h-6 mb-1 text-slate-400" />
                        <span className="text-[11px] font-medium leading-tight">Prendre photo ou téléverser</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Mode dégradé sans photo (EF11) */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    id="sans-photo"
                    checked={sansPhoto}
                    onChange={(e) => {
                      setSansPhoto(e.target.checked);
                      if (e.target.checked) setPhotos([]);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="sans-photo" className="text-xs text-slate-600 cursor-pointer">
                    Appareil photo indisponible (Mode dégradé sans photo — soumis à vérification)
                  </label>
                </div>
              </div>

              {/* IA Analysis Results Box */}
              {analyzingIA && (
                <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <div>
                    <span className="font-semibold text-emerald-400">Analyse IA Gemini en cours...</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">Classification automatique du type de déchet urbain</p>
                  </div>
                </div>
              )}

              {iaResult && !analyzingIA && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>
                        Suggestion IA : {categories.find(c => c.id_categorie === iaResult.id_categorie)?.nom}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px]">
                      {(iaResult.score * 100).toFixed(0)}% de confiance
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">
                    {iaResult.description}
                  </p>
                  <p className="text-[10px] text-emerald-800/80 mt-1 italic">
                    {iaResult.score >= 0.8
                      ? "✓ Suggestion fiable (pré-sélectionnée automatiquement, modifiable ci-dessous)."
                      : "⚠ Suggestion incertaine : veuillez confirmer la catégorie manuellement."}
                  </p>
                </div>
              )}

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catégorie retenue <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.id_categorie}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                        selectedCategorie === cat.id_categorie
                          ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="categorie"
                        value={cat.id_categorie}
                        checked={selectedCategorie === cat.id_categorie}
                        onChange={(e) => setSelectedCategorie(e.target.value)}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{cat.nom}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Priorité base : {cat.priorite_base}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCALISATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Localisation géographique (Grand Lomé) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locatingGps}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
                  >
                    {locatingGps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    <span>Position GPS</span>
                  </button>
                </div>

                {gpsError && (
                  <div className="p-2.5 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    {gpsError}
                  </div>
                )}

                {/* Quick preset quartier selector */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Positionner rapidement sur un quartier de Lomé :
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {quartiers.slice(0, 8).map((q) => (
                      <button
                        key={q.id_quartier}
                        type="button"
                        onClick={() => {
                          setLatitude(q.centre_lat);
                          setLongitude(q.centre_lon);
                          checkNearbyDuplicates(q.centre_lat, q.centre_lon);
                        }}
                        className={`text-[10px] font-medium px-2 py-1 rounded-md border transition cursor-pointer ${
                          Math.abs(latitude - q.centre_lat) < 0.005 && Math.abs(longitude - q.centre_lon) < 0.005
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {q.nom}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Repère text input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Repère visuel (facultatif, max 120 caractères)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Ex: Face à la pharmacie du Marché de Bè, près du château d'eau"
                    value={repere}
                    onChange={(e) => setRepere(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Duplicate Detection Warning (RG04) */}
              {nearbyDuplicates.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Signalement similaire détecté à proximité !</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Un dépôt de même catégorie existe déjà à moins de 50 m. Pour éviter les doublons, vous pouvez confirmer l'existant en un clic :
                  </p>
                  <div className="space-y-1.5">
                    {nearbyDuplicates.slice(0, 2).map((dup) => (
                      <div key={dup.id_signalement} className="bg-white/80 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="font-semibold block truncate">{dup.description}</span>
                          <span className="text-[10px] text-slate-500">{dup.quartier_nom} • Statut : {dup.statut}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onConfirmExistingReport(dup.id_signalement)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-700 shrink-0 cursor-pointer"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Moi aussi</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: DESCRIPTION & SUBMIT */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description du problème <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="Décrivez précisément la nature des déchets, le volume estimé, la gêne occasionnée (odeurs, circulation bloquée, eau stagnante)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-emerald-500"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>Minimum 10 caractères</span>
                  <span>{description.length}/500</span>
                </div>
              </div>

              {/* Summary recap box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 text-xs block mb-1">Récapitulatif avant envoi</span>
                <div className="flex justify-between text-slate-600">
                  <span>Catégorie :</span>
                  <span className="font-semibold text-slate-900">
                    {categories.find(c => c.id_categorie === selectedCategorie)?.nom || 'Non spécifiée'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Localisation :</span>
                  <span className="font-semibold text-slate-900">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </span>
                </div>
                {repere && (
                  <div className="flex justify-between text-slate-600">
                    <span>Repère :</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[200px]">{repere}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Photos :</span>
                  <span className="font-semibold text-slate-900">
                    {sansPhoto ? 'Mode dégradé sans photo' : `${photos.length} photo(s)`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Précédent</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                if (step === 1 && !selectedCategorie) {
                  setErrorMsg('Veuillez sélectionner une catégorie.');
                  return;
                }
                setStep((step + 1) as any);
              }}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Suivant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{submitting ? 'Enregistrement...' : 'Confirmer et envoyer'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
