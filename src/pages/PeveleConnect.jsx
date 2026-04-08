// ═══════════════════════════════════════════════════════════════════════════
// PeveleConnect.jsx — Moteur covoiturage avec matching IA + realtime
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { covoiturageService, communesService } from "@/api/services";
import { validate, covoiturageSearchSchema } from "@/lib/schemas";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/lib/AuthContext";
import { Car, MapPin, Clock, Euro, Star, Wifi, Loader2, AlertCircle, Plus, Users } from "lucide-react";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function ScoreBadge({ score }) {
  const color = score >= 70 ? "bg-green-100 text-green-700" : score >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>{score}% match</span>;
}

function TrajetCard({ trajet, onDemander, isAuth }) {
  const jours = (trajet.jours_semaine || [1,2,3,4,5]).map(j => JOURS[j-1]).join(", ");
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <ScoreBadge score={trajet._score || 0} />
            {trajet._distance_depart_km !== undefined && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{trajet._distance_depart_km} km de vous
              </span>
            )}
            {trajet._economie_mois && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Euro className="w-3 h-3" />~{trajet._economie_mois}€/mois éco.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">
              {trajet.conducteur_avatar ? <img src={trajet.conducteur_avatar} className="w-8 h-8 rounded-full object-cover" alt="" /> : "🚗"}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{trajet.conducteur_nom || "Conducteur anonyme"}</p>
              <p className="text-xs text-gray-500">{trajet.commune_depart_nom || "Départ"} → {trajet.commune_arrivee}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" />{trajet.heure_depart?.slice(0,5)}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-blue-400" />{trajet.places_dispo} place{trajet.places_dispo>1?"s":""}</span>
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <Euro className="w-3 h-3" />{trajet.contribution_eur > 0 ? `${trajet.contribution_eur}€/trajet` : "Gratuit"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{jours}</p>
          {trajet.commentaire && <p className="text-xs text-gray-500 italic mt-1">"{trajet.commentaire}"</p>}
        </div>
      </div>
      <button onClick={() => isAuth ? onDemander(trajet.id) : window.location.href='/se-connecter'}
        className="w-full mt-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
        {isAuth ? "Demander une place" : "Se connecter pour réserver"}
      </button>
    </div>
  );
}

export default function PeveleConnect() {
  const { isAuthenticated } = useAuth();
  const [communes, setCommunes]   = useState([]);
  const [results, setResults]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [liveNew, setLiveNew]     = useState(0);
  const [formErrors, setFE]       = useState({});
  const [form, setForm] = useState({
    commune_id: "", commune_arrivee: "", heure_depart: "", jours: [1,2,3,4,5], rayon_km: 15,
  });

  useEffect(() => {
    communesService.list().then(r => setCommunes(r.data || []));
    // Realtime : nouveaux trajets
    const ch = covoiturageService.subscribeToNewTrajets(() => setLiveNew(c => c + 1));
    return () => { ch.unsubscribe(); };
  }, []);

  const handleSearch = async () => {
    const commune = communes.find(c => c.id === form.commune_id);
    if (!commune?.latitude || !commune?.longitude) {
      setFE({ commune_id: "Sélectionnez votre commune de départ" }); return;
    }
    const payload = {
      lat_depart: Number(commune.latitude),
      lon_depart: Number(commune.longitude),
      commune_arrivee: form.commune_arrivee || undefined,
      heure_depart: form.heure_depart || undefined,
      jours: form.jours,
      rayon_km: form.rayon_km,
    };
    const { ok, errors } = validate(covoiturageSearchSchema, payload);
    if (!ok) { setFE(errors); return; }
    setFE({}); setLoading(true); setError(null);
    const { data, error: err } = await covoiturageService.search(payload);
    setLoading(false);
    if (err) { setError(err.message || "Erreur de recherche"); return; }
    setResults(data);
  };

  const handleDemander = async (trajet_id) => {
    const { error: err } = await covoiturageService.demanderPlace({ trajet_id, message: "Je suis intéressé(e) par ce trajet." });
    if (err) alert(err.message);
    else alert("Demande envoyée ! Le conducteur vous contactera.");
  };

  const toggleJour = (j) => setForm(f => ({
    ...f,
    jours: f.jours.includes(j) ? f.jours.filter(x => x !== j) : [...f.jours, j]
  }));

  return (
    <ErrorBoundary section="Pévèle Connect">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Car className="w-4 h-4" /> Pévèle Connect — Covoiturage local
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Partagez le trajet, partagez les frais</h1>
          <p className="text-gray-500 text-sm mt-1">Matching géolocalisé dans la Pévèle Carembault</p>
          {liveNew > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <Wifi className="w-3 h-3" /> {liveNew} nouveau{liveNew > 1 ? "x" : ""} trajet{liveNew > 1 ? "s" : ""} depuis votre arrivée
            </div>
          )}
        </div>

        {/* Formulaire recherche */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">🔍 Trouver un covoiturage</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ma commune de départ *</label>
              <select value={form.commune_id} onChange={e => setForm(f => ({...f, commune_id: e.target.value}))}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${formErrors.commune_id ? "border-red-300" : "border-gray-200"}`}>
                <option value="">Sélectionnez votre commune</option>
                {communes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {formErrors.commune_id && <p className="text-xs text-red-500 mt-1">{formErrors.commune_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Destination</label>
                <input value={form.commune_arrivee} onChange={e => setForm(f => ({...f, commune_arrivee: e.target.value}))}
                  placeholder="Ex: Lille, Lesquin..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Heure de départ</label>
                <input type="time" value={form.heure_depart} onChange={e => setForm(f => ({...f, heure_depart: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Jours de la semaine</label>
              <div className="flex gap-1.5 flex-wrap">
                {JOURS.map((j, i) => (
                  <button key={i} onClick={() => toggleJour(i+1)} type="button"
                    className={`w-9 h-9 rounded-full text-xs font-medium border transition-all ${form.jours.includes(i+1) ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-500 border-gray-200 hover:border-orange-200"}`}>
                    {j.slice(0,2)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Rayon de recherche : {form.rayon_km} km</label>
              <input type="range" min="3" max="50" value={form.rayon_km} onChange={e => setForm(f => ({...f, rayon_km: Number(e.target.value)}))}
                className="w-full accent-orange-500" />
            </div>
            <button onClick={handleSearch} disabled={loading}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Recherche...</> : "🔍 Trouver des covoiturages"}
            </button>
          </div>
        </div>

        {/* Résultats */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl mb-4 text-sm border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {results !== null && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">{results.length} trajet{results.length !== 1 ? "s" : ""} trouvé{results.length !== 1 ? "s" : ""}</h2>
              {results.length > 0 && <span className="text-xs text-gray-400">Trié par compatibilité</span>}
            </div>
            {results.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-gray-600">Aucun trajet disponible dans ce rayon</p>
                <p className="text-sm mt-1">Élargissez le rayon ou proposez le vôtre !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(t => <TrajetCard key={t.id} trajet={t} onDemander={handleDemander} isAuth={isAuthenticated} />)}
              </div>
            )}
          </div>
        )}

        {/* CTA proposer trajet */}
        <div className="mt-8 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 text-center">
          <p className="font-semibold text-gray-800 mb-1">Vous faites régulièrement ce trajet ?</p>
          <p className="text-sm text-gray-500 mb-3">Proposez votre covoiturage et réduisez vos frais de carburant</p>
          <button onClick={() => isAuthenticated ? alert("Formulaire de proposition à venir") : window.location.href="/se-connecter"}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Proposer mon trajet
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
