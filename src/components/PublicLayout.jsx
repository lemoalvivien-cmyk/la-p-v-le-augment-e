import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import PublicAssistant from '@/components/PublicAssistant';
import { Menu, X, MapPin } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import PresenceBar from "@/components/PresenceBar";

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navLinks = [
    { to: "/", label: "Accueil" },
    { to: "/agenda", label: "📅 Agenda" },
    { to: "/soirees", label: "🎉 Soirées" },
    { to: "/messagerie", label: "💬 Messages" },
    { to: "/alertes", label: "🚨 Alertes" },
    { to: "/place-du-village", label: "🏘️ Place du village" },
    { to: "/a-propos", label: "À propos" },
  ];

  const isActive = (path) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Header */}
      <header className="bg-white border-b border-ink/8 sticky top-0 z-50 shadow-sm">
        <div className="h-1 w-full" style={{ backgroundColor: "#FF6A00" }} />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FF6A00" }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-black text-sm text-ink">La Pévèle Augmentée</div>
              <div className="text-xs font-medium" style={{ color: "#FF6A00" }}>Pévèle Carembault</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to}
                className="text-sm font-semibold transition-colors"
                style={isActive(to) ? { color: "#FF6A00" } : { color: "rgba(29,24,54,0.6)" }}>
                {label}
              </Link>
            ))}

            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/mairie/tableau-de-bord"
                    className="text-sm font-semibold transition-colors"
                    style={{ color: "rgba(29,24,54,0.6)" }}>
                    🏛️ Tableau de bord
                  </Link>
                )}
                <Link to="/mon-espace"
                  className="text-sm font-semibold transition-colors"
                  style={{ color: "rgba(29,24,54,0.6)" }}>
                  Mon espace
                </Link>
                <button
                  onClick={() => base44.auth.logout("/")}
                  className="text-sm font-semibold transition-colors"
                  style={{ color: "rgba(29,24,54,0.6)" }}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/se-connecter"
                  className="text-sm font-semibold transition-colors"
                  style={{ color: "rgba(29,24,54,0.6)" }}>
                  Se connecter
                </Link>
                <Link to="/creer-un-compte"
                  className="text-sm font-bold px-4 py-2 rounded-full border-2 transition-all hover:shadow-md bg-white"
                  style={{ borderColor: "#1D1836", color: "#1D1836" }}>
                  Créer un compte
                </Link>
              </>
            )}

            <Link to="/agir"
              className="text-white font-bold text-sm px-5 py-2.5 rounded-full transition-all hover:scale-105 shadow-md"
              style={{ backgroundColor: "#FF6A00" }}>
              Agir maintenant
            </Link>
          </nav>

          {/* Mobile burger */}
          <button className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6 text-ink" /> : <Menu className="w-6 h-6 text-ink" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden bg-white border-t-2 border-ink/10 px-4 pb-6 pt-2 space-y-1">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className="block py-3 text-base font-semibold text-ink border-b border-ink/5">
                {label}
              </Link>
            ))}
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/mairie/tableau-de-bord" onClick={() => setOpen(false)}
                    className="block py-3 text-base font-semibold text-ink border-b border-ink/5">
                    🏛️ Tableau de bord
                  </Link>
                )}
                <Link to="/mon-espace" onClick={() => setOpen(false)}
                  className="block py-3 text-base font-semibold text-ink border-b border-ink/5">
                  Mon espace
                </Link>
                <button onClick={() => { setOpen(false); base44.auth.logout("/"); }}
                  className="block w-full text-left py-3 text-base font-semibold text-ink border-b border-ink/5">
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/se-connecter" onClick={() => setOpen(false)}
                  className="block py-3 text-base font-semibold text-ink border-b border-ink/5">
                  Se connecter
                </Link>
                <Link to="/creer-un-compte" onClick={() => setOpen(false)}
                  className="block py-3 text-base font-bold border-b border-ink/5"
                  style={{ color: "#FF6A00" }}>
                  Créer un compte
                </Link>
              </>
            )}
            <div className="pt-3">
              <Link to="/agir" onClick={() => setOpen(false)}
                className="block w-full text-center text-white font-bold py-4 rounded-2xl text-lg shadow-md"
                style={{ backgroundColor: "#FF6A00" }}>
                Agir maintenant
              </Link>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-3 w-full flex justify-center md:justify-end">
        <PresenceBar />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-ink text-white pt-10 pb-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FF6A00" }}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-black text-sm">La Pévèle Augmentée</div>
                <div className="text-xs text-white/40">Territoire de la Pévèle</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-white/50 flex-wrap">
              <Link to="/place-du-village" className="hover:text-white transition-colors">Place du village</Link>
              <Link to="/agenda" className="hover:text-white transition-colors">Agenda</Link>
              <Link to="/associations" className="hover:text-white transition-colors">Associations</Link>
              <Link to="/emploi-business-local" className="hover:text-white transition-colors">Emploi & business</Link>
              <Link to="/observatoire" className="hover:text-white transition-colors">Observatoire</Link>
              <Link to="/agir" className="hover:text-white transition-colors">Agir</Link>
              <Link to="/mairie-candidature" className="hover:text-white transition-colors">Votre commune sur la plateforme</Link>
              <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-xs text-white/30 text-center">
            © 2026 La Pévèle Augmentée · lapeveleaugmentee.fr · Fait pour les habitants de la Pévèle Carembault
          </div>
        </div>
      </footer>
      <PublicAssistant />
    </div>
  );
}