// ═══════════════════════════════════════════════════════════════════════════
// Alertes.jsx — Sprint 1 — Alertes hyperlocales temps réel
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { AlertTriangle, Plus, Loader2, Sparkles, X } from "lucide-react";
import PresenceBar from "@/components/PresenceBar";

const TYPES = [
  { v: "securite",     label: "🚨 Sécurité",     color: "#ef4444" },
  { v: "perdu",        label: "🐾 Perdu/Trouvé", color: "#f59e0b" },
  { v: "meteo",        label: "⛈️ Météo",        color: "#3b82f6" },
  { v: "promo",        label: "🛍️ Promo",        color: "#10b981" },
  { v: "signalement",  label: "🛠️ Signalement", color: "#8b5cf6" },
  { v: "animal",       label: "🐕 Animal",       color: "#f59e0b" },
  { v: "info",         label: "ℹ️ Info",         color: "#6b7280" },
];

function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return Math.floor(s / 60) + " min";
  if (s < 86400) return Math.floor(s / 3600) + " h";
  return Math.floor(s / 86400) + " j";
}

function AlertCard({ a }) {
  const meta = TYPES.find(t => t.v === a.type) || TYPES[6];
  return (
    <div
      className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm hover:shadow-md transition-all"
      style={{ borderLeftWidth: 4, borderLeftColor: meta.color, animation: "slideIn .4s ease" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.color + "20", color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</span>
      </div>
      <h3 className="font-bold text-ink mt-2">{a.title}</h3>
      {a.body && <p className="text-sm text-gray-600 mt-1">{a.body}</p>}
      <div className="text-[10px] text-gray-400 mt-2">Rayon : {a.radius_km} km · Sévérité : {"●".repeat(a.severity)}</div>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function NewAlertModal({ onClose, onCreated, user }) {
  const [type, setType] = useState("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState(2);
  const [radius, setRadius] = useState(2);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  // Mini IA locale : suggère un titre depuis le body
  const suggestTitle = () => {
    if (!body.trim()) return;
    setAiBusy(true);
    setTimeout(() => {
      const txt = body.trim();
      const first = txt.split(/[.!?\n]/)[0].slice(0, 60);
      setTitle(first.charAt(0).toUpperCase() + first.slice(1));
      setAiBusy(false);
    }, 400);
  };

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("local_alerts").insert({
      type, title: title.trim(), body: body.trim() || null,
      severity, radius_km: radius, author_id: user.id,
    });
    if (!error) onCreated();
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-xl text-ink">Nouvelle alerte</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPES.map(t => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v)}
                  className={`text-[11px] font-semibold px-2 py-2 rounded-lg border transition-all ${type === t.v ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Description</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Décris la situation..."
              className="w-full px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block flex items-center justify-between">
              <span>Titre</span>
              <button
                onClick={suggestTitle}
                disabled={!body.trim() || aiBusy}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />{aiBusy ? "..." : "Suggérer"}
              </button>
            </label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              maxLength={140} placeholder="Titre court et clair"
              className="w-full px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Sévérité ({severity}/5)</label>
              <input type="range" min="1" max="5" value={severity} onChange={e => setSeverity(+e.target.value)} className="w-full accent-orange-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Rayon ({radius} km)</label>
              <input type="range" min="0.5" max="10" step="0.5" value={radius} onChange={e => setRadius(+e.target.value)} className="w-full accent-orange-500" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-semibold hover:bg-gray-50">Annuler</button>
            <button
              onClick={submit}
              disabled={busy || !title.trim()}
              className="flex-1 px-4 py-2.5 rounded-full text-white text-sm font-bold shadow-md hover:scale-105 transition-transform disabled:opacity-50"
              style={{ backgroundColor: "#FF6A00" }}
            >
              {busy ? "..." : "Publier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Alertes() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    supabase
      .from("local_alerts")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setAlerts(data || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel("local_alerts:feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "local_alerts" }, payload => {
        setAlerts(a => [payload.new, ...a]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.type === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">🚨 Alertes hyperlocales</h1>
          <p className="text-sm text-gray-600">Ce qui se passe dans la Pévèle, en temps réel.</p>
        </div>
        <PresenceBar />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === "all" ? "text-white" : "bg-white border border-orange-200 text-gray-700"}`}
          style={filter === "all" ? { backgroundColor: "#FF6A00" } : {}}
        >
          Toutes ({alerts.length})
        </button>
        {TYPES.map(t => {
          const n = alerts.filter(a => a.type === t.v).length;
          return (
            <button key={t.v} onClick={() => setFilter(t.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === t.v ? "text-white" : "bg-white border border-orange-200 text-gray-700"}`}
              style={filter === t.v ? { backgroundColor: "#FF6A00" } : {}}
            >
              {t.label} {n > 0 && <span className="opacity-75">({n})</span>}
            </button>
          );
        })}
      </div>

      {user && (
        <button
          onClick={() => setShowNew(true)}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-bold shadow-md hover:scale-105 transition-transform"
          style={{ backgroundColor: "#FF6A00" }}
        >
          <Plus className="w-4 h-4" /> Publier une alerte
        </button>
      )}

      {loading && <div className="text-center text-gray-400 py-8"><Loader2 className="w-6 h-6 animate-spin inline" /></div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-gray-500 py-12 bg-white rounded-3xl border border-orange-100">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-orange-300" />
          Aucune alerte active. Bon signe !
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(a => <AlertCard key={a.id} a={a} />)}
      </div>

      {showNew && user && (
        <NewAlertModal user={user} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}
