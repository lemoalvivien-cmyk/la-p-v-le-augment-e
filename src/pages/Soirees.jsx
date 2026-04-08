// ═══════════════════════════════════════════════════════════════════════════
// Soirees.jsx — Sprint 1 — Module Soirées Pévèle (20 templates)
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Calendar, MapPin, Users, Sparkles, X, Loader2, Plus } from "lucide-react";
import PresenceBar from "@/components/PresenceBar";

function TemplateCard({ t, onPick }) {
  return (
    <button
      onClick={() => onPick(t)}
      className="bg-white rounded-3xl border border-orange-100 p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
      style={{ animation: "fadeUp .5s ease both" }}
    >
      <div className="text-4xl mb-2">{t.emoji}</div>
      <h3 className="font-black text-ink group-hover:text-orange-600 transition-colors">{t.title}</h3>
      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{t.cible}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{t.saison}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">{t.budget_min}–{t.budget_max} €</span>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </button>
  );
}

function CreateSoireeModal({ template, user, onClose, onCreated }) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [lieu, setLieu] = useState("");
  const [capacite, setCapacite] = useState(20);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  // IA : génère une description plus engageante (heuristique locale, branchable Claude)
  const enrichDescription = () => {
    setAiBusy(true);
    setTimeout(() => {
      const variants = [
        `${template.emoji} ${template.title} dans la Pévèle ! ${template.description} On compte sur ta présence pour faire vivre le territoire.`,
        `${template.emoji} ${template.description} Une soirée chaleureuse et locale, ouverte à tous les Pévélois qui veulent partager un bon moment.`,
        `${template.emoji} Rejoins-nous pour ${template.title.toLowerCase()} : ${template.description.toLowerCase()} L'occasion idéale de rencontrer tes voisins !`,
      ];
      setDescription(variants[Math.floor(Math.random() * variants.length)]);
      setAiBusy(false);
    }, 500);
  };

  const submit = async () => {
    if (!title.trim() || !date) return;
    setBusy(true);
    const starts_at = new Date(`${date}T${time}:00`).toISOString();
    const { data, error } = await supabase.from("soirees").insert({
      template_id: template.id,
      organizer_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      starts_at,
      duree_h: template.duree_h,
      lieu: lieu.trim() || null,
      capacite_max: capacite || null,
    }).select().single();
    if (!error && data) {
      // RSVP automatique de l'organisateur
      await supabase.from("soiree_rsvp").insert({ soiree_id: data.id, user_id: user.id, status: "yes" });
      onCreated(data);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl">{template.emoji}</div>
            <h3 className="font-black text-xl text-ink">{template.title}</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre"
            className="w-full px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm" />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-600">Description</label>
              <button onClick={enrichDescription} disabled={aiBusy}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />{aiBusy ? "..." : "IA enrichit"}
              </button>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm" />
          </div>
          <input type="text" value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Lieu (salle des fêtes, chez moi…)"
            className="w-full px-3 py-2 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none text-sm" />
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Capacité max : {capacite}</label>
            <input type="range" min="2" max="200" value={capacite} onChange={e => setCapacite(+e.target.value)} className="w-full accent-orange-500" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-semibold">Annuler</button>
            <button onClick={submit} disabled={busy || !title.trim() || !date}
              className="flex-1 px-4 py-2.5 rounded-full text-white text-sm font-bold shadow-md hover:scale-105 transition-transform disabled:opacity-50"
              style={{ backgroundColor: "#FF6A00" }}>
              {busy ? "..." : "Créer la soirée"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SoireeCard({ s, onRSVP, rsvped }) {
  const d = new Date(s.starts_at);
  return (
    <div className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm hover:shadow-md transition-all">
      <h4 className="font-bold text-ink">{s.title}</h4>
      {s.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{s.description}</p>}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
        {s.lieu && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.lieu}</span>}
        {s.capacite_max && <span className="flex items-center gap-1"><Users className="w-3 h-3" />/{s.capacite_max}</span>}
      </div>
      <button
        onClick={() => onRSVP(s)}
        className={`mt-3 w-full px-3 py-2 rounded-full text-xs font-bold transition-all ${rsvped ? "bg-green-100 text-green-700" : "text-white shadow-md hover:scale-105"}`}
        style={!rsvped ? { backgroundColor: "#FF6A00" } : {}}
      >
        {rsvped ? "✓ J'y vais" : "Je participe"}
      </button>
    </div>
  );
}

export default function Soirees() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [soirees, setSoirees] = useState([]);
  const [myRsvps, setMyRsvps] = useState(new Set());
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    Promise.all([
      supabase.from("soiree_templates").select("*").eq("is_active", true).order("id"),
      supabase.from("soirees").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(50),
    ]).then(([t, s]) => {
      setTemplates(t.data || []);
      setSoirees(s.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("soiree_rsvp").select("soiree_id").eq("user_id", user.id).then(({ data }) => {
      setMyRsvps(new Set((data || []).map(r => r.soiree_id)));
    });
  }, [user?.id]);

  const handleRSVP = async (s) => {
    if (!user) { alert("Connecte-toi pour participer"); return; }
    if (myRsvps.has(s.id)) {
      await supabase.from("soiree_rsvp").delete().match({ soiree_id: s.id, user_id: user.id });
      setMyRsvps(prev => { const n = new Set(prev); n.delete(s.id); return n; });
    } else {
      await supabase.from("soiree_rsvp").insert({ soiree_id: s.id, user_id: user.id, status: "yes" });
      setMyRsvps(prev => new Set(prev).add(s.id));
    }
  };

  const reload = () => {
    supabase.from("soirees").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(50)
      .then(({ data }) => setSoirees(data || []));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">🎉 Soirées Pévèle</h1>
          <p className="text-sm text-gray-600">Choisis un thème, lance la soirée en 2 minutes.</p>
        </div>
        <PresenceBar />
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("upcoming")}
          className={`px-4 py-2 rounded-full text-sm font-bold ${tab === "upcoming" ? "text-white" : "bg-white border border-orange-200 text-gray-700"}`}
          style={tab === "upcoming" ? { backgroundColor: "#FF6A00" } : {}}>
          🗓️ À venir ({soirees.length})
        </button>
        <button onClick={() => setTab("templates")}
          className={`px-4 py-2 rounded-full text-sm font-bold ${tab === "templates" ? "text-white" : "bg-white border border-orange-200 text-gray-700"}`}
          style={tab === "templates" ? { backgroundColor: "#FF6A00" } : {}}>
          ✨ 20 thèmes
        </button>
      </div>

      {loading && <div className="text-center text-gray-400 py-8"><Loader2 className="w-6 h-6 animate-spin inline" /></div>}

      {!loading && tab === "upcoming" && (
        <>
          {soirees.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-white rounded-3xl border border-orange-100">
              Aucune soirée prévue. Lance la première !
              <div className="mt-4">
                <button onClick={() => setTab("templates")} className="px-4 py-2 rounded-full text-white text-sm font-bold shadow-md" style={{ backgroundColor: "#FF6A00" }}>
                  <Plus className="w-4 h-4 inline -mt-0.5 mr-1" />Choisir un thème
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {soirees.map(s => <SoireeCard key={s.id} s={s} onRSVP={handleRSVP} rsvped={myRsvps.has(s.id)} />)}
            </div>
          )}
        </>
      )}

      {!loading && tab === "templates" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {templates.map(t => <TemplateCard key={t.id} t={t} onPick={setPicked} />)}
        </div>
      )}

      {picked && user && (
        <CreateSoireeModal template={picked} user={user}
          onClose={() => setPicked(null)}
          onCreated={() => { setPicked(null); reload(); setTab("upcoming"); }} />
      )}
      {picked && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPicked(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm text-center">
            <p className="text-sm text-gray-600 mb-4">Connecte-toi pour créer une soirée.</p>
            <a href="/connexion" className="inline-block px-6 py-2 rounded-full text-white font-bold shadow-md" style={{ backgroundColor: "#FF6A00" }}>Se connecter</a>
          </div>
        </div>
      )}
    </div>
  );
}
