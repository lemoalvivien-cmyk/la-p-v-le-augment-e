// ═══════════════════════════════════════════════════════════════════════════
// PresenceBar.jsx — "Qui est en ligne ?" — Sprint 1 (Vivant)
// Supabase Realtime Presence — zéro coût, temps réel pur.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Users } from "lucide-react";

const CHANNEL = "presence:village";

function Avatar({ name, url, idx }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="relative inline-flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-white shadow-sm text-[10px] font-bold text-white animate-[fadeIn_.4s_ease]"
      style={{ backgroundColor: "#FF6A00", marginLeft: idx === 0 ? 0 : -10, zIndex: 30 - idx }}
      title={name || "Pévélois"}
    >
      {url ? <img src={url} alt="" className="w-8 h-8 rounded-full object-cover" /> : initials}
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
    </div>
  );
}

export default function PresenceBar({ className = "" }) {
  const { user, profile } = useAuth();
  const [online, setOnline] = useState([]);

  useEffect(() => {
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: user?.id || `anon-${Math.random().toString(36).slice(2, 10)}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list = [];
        Object.values(state).forEach(arr => arr.forEach(p => list.push(p)));
        // déduplique par key (un user = une présence)
        const seen = new Set();
        const unique = list.filter(p => {
          if (seen.has(p.key)) return false;
          seen.add(p.key);
          return true;
        });
        setOnline(unique);
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            key: user?.id || "anon",
            name: profile?.display_name || (user?.email || "Pévélois").split("@")[0],
            avatar_url: profile?.avatar_url || null,
            commune_id: profile?.commune_id || null,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, profile?.display_name, profile?.avatar_url, profile?.commune_id]);

  const visible = useMemo(() => online.slice(0, 6), [online]);
  const total = online.length;

  if (total === 0) return null;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur border border-orange-100 shadow-sm ${className}`}
      style={{ animation: "fadeIn .5s ease" }}
    >
      <div className="flex items-center">
        {visible.map((p, i) => <Avatar key={p.key + i} name={p.name} url={p.avatar_url} idx={i} />)}
        {total > 6 && (
          <span className="ml-2 text-xs font-bold text-gray-600">+{total - 6}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span><span style={{ color: "#FF6A00" }}>{total}</span> {total > 1 ? "Pévélois en ligne" : "Pévélois en ligne"}</span>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
