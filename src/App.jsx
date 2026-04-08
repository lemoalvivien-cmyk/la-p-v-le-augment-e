import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PublicLayout from './components/PublicLayout';
import InternalLayout from './components/InternalLayout';

// ── Critical above-fold pages — static imports (LCP) ─────────────────────
import Landing from './pages/Landing';
import Agir from './pages/Agir';
import SeConnecter from './pages/SeConnecter';
import Connexion from './pages/Connexion';
import CreerUnCompte from './pages/CreerUnCompte';
import Activation from './pages/Activation';
import ActivationComplete from './pages/ActivationComplete';

// ── Lazy-loaded public pages ──────────────────────────────────────────────
const Signaler = lazy(() => import('./pages/Signaler'));
const Proposer = lazy(() => import('./pages/Proposer'));
const Aider = lazy(() => import('./pages/Aider'));
const MonSuivi = lazy(() => import('./pages/MonSuivi'));
const PlaceVillage = lazy(() => import('./pages/PlaceVillage'));
const MonProfil = lazy(() => import('./pages/MonProfil'));
const MairieCandidature = lazy(() => import('./pages/MairieCandidature'));
const MentionsLegales = lazy(() => import('./pages/MentionsLegales'));
const RGPD = lazy(() => import('./pages/RGPD'));
const CookiesPage = lazy(() => import('./pages/Cookies'));
const CookieBanner = lazy(() => import('./components/CookieBanner'));
const APropos = lazy(() => import('./pages/APropos'));
const Services = lazy(() => import('./pages/Services'));
const Agenda = lazy(() => import('./pages/Agenda'));
const TableauDuTerritoire = lazy(() => import('./pages/TableauDuTerritoire'));
const Associations = lazy(() => import('./pages/Associations'));
const EmploiBusinessLocal = lazy(() => import('./pages/EmploiBusinessLocal'));
const CommunePage = lazy(() => import('./pages/CommunePage'));
const Observatoire = lazy(() => import('./pages/Observatoire'));
const MonEspace = lazy(() => import('./pages/MonEspace'));
const Victoires = lazy(() => import('./pages/Victoires'));
const ServicesMairie = lazy(() => import('./pages/ServicesMairie'));

// ── Sprint 1 — Vivant : Messagerie / Alertes / Soirées ───────────────────
const Messagerie = lazy(() => import('./pages/Messagerie'));
const Alertes = lazy(() => import('./pages/Alertes'));
const Soirees = lazy(() => import('./pages/Soirees'));

// ── Phase 1 — Lazy-loaded CDC V4 Supernova ────────────────────────────────
const MairePlus = lazy(() => import('./pages/MairePlus'));
const Sponsor = lazy(() => import('./pages/Sponsor'));
const OnboardingInterets = lazy(() => import('./pages/OnboardingInterets'));
const MonDashboard = lazy(() => import('./pages/MonDashboard'));

// ── Phase 2 — Lazy-loaded B2B WIINUP + Marketplace + Rencontres ──────────
const B2B = lazy(() => import('./pages/B2B'));
const B2BBesoins = lazy(() => import('./pages/b2b/Besoins'));
const B2BIntroductions = lazy(() => import('./pages/b2b/Introductions'));
const B2BProspection = lazy(() => import('./pages/b2b/Prospection'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const MarketplaceListingPage = lazy(() => import('./pages/MarketplaceListing'));
const Rencontres = lazy(() => import('./pages/Rencontres'));
const FlashDate = lazy(() => import('./pages/FlashDate'));

// ── Lazy-loaded mairie pages ──────────────────────────────────────────────
const TableauDeBord = lazy(() => import('./pages/mairie/TableauDeBord'));
const Dossiers = lazy(() => import('./pages/mairie/Dossiers'));
const DossierDetail = lazy(() => import('./pages/mairie/DossierDetail'));
const MairePlaceVillage = lazy(() => import('./pages/mairie/MairePlaceVillage'));
const Preuves = lazy(() => import('./pages/mairie/Preuves'));
const Parametres = lazy(() => import('./pages/mairie/Parametres'));
const Evenements = lazy(() => import('./pages/mairie/Evenements'));
const Digest = lazy(() => import('./pages/mairie/Digest'));
const SponsorsMairie = lazy(() => import('./pages/mairie/SponsorsMairie'));
const RapportMandat = lazy(() => import('./pages/mairie/RapportMandat'));

// ── Lazy-loaded admin pages ───────────────────────────────────────────────
const Collectivites = lazy(() => import('./pages/admin/Collectivites'));
const Monitoring = lazy(() => import('./pages/admin/Monitoring'));
const Revenue = lazy(() => import('./pages/admin/Revenue'));
const IAUsage = lazy(() => import('./pages/admin/IAUsage'));

// ── Suspense fallback — spinner léger ────────────────────────────────────
const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white/60">
    <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
  </div>
);

const PUBLIC_PATHS = [
  "/", "/agir", "/agenda", "/place-du-village", "/signaler", "/proposer", "/aider",
  "/connexion", "/activation", "/activation-complete", "/a-propos", "/services",
  "/tableau-du-territoire", "/associations", "/emploi-business-local", "/observatoire",
  "/mairie-plus", "/sponsor",
  "/messagerie", "/alertes", "/soirees",
  // Phase 2
  "/b2b", "/b2b/besoins", "/marketplace", "/rencontres", "/flash-date",
  "/rgpd", "/cookies", "/mentions-legales",
];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      const isPublicPath = PUBLIC_PATHS.includes(location.pathname) || location.pathname.startsWith('/mon-suivi/');
      if (!isPublicPath) {
        navigateToLogin();
        return null;
      }
      // Public paths: let them through even without auth
    }
  }

  // Render the main app
  return (
  <Suspense fallback={<PageLoader />}>
  <Routes>
    {/* Routes publiques — zéro lien admin/mairie */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Landing />} />
      <Route path="/agir" element={<Agir />} />
      <Route path="/signaler" element={<Signaler />} />
      <Route path="/proposer" element={<Proposer />} />
      <Route path="/aider" element={<Aider />} />
      <Route path="/mon-suivi/:token" element={<MonSuivi />} />
      <Route path="/place-du-village" element={<PlaceVillage />} />
      <Route path="/agenda" element={<Agenda />} />
      {/* Sprint 1 — Vivant */}
      <Route path="/messagerie" element={<Messagerie />} />
      <Route path="/alertes" element={<Alertes />} />
      <Route path="/soirees" element={<Soirees />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/se-connecter" element={<SeConnecter />} />
      <Route path="/creer-un-compte" element={<CreerUnCompte />} />
      <Route path="/mon-profil" element={<MonProfil />} />
      <Route path="/activation" element={<Activation />} />
      <Route path="/activation-complete" element={<ActivationComplete />} />
      <Route path="/mairie-candidature" element={<MairieCandidature />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/rgpd" element={<RGPD />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/a-propos" element={<APropos />} />
      <Route path="/services" element={<Services />} />
      <Route path="/tableau-du-territoire" element={<TableauDuTerritoire />} />
      <Route path="/associations" element={<Associations />} />
      <Route path="/emploi-business-local" element={<EmploiBusinessLocal />} />
      <Route path="/commune/:slug" element={<CommunePage />} />
      <Route path="/observatoire" element={<Observatoire />} />
      <Route path="/mon-espace" element={<MonEspace />} />
      <Route path="/victoires" element={<Victoires />} />
      <Route path="/services-mairie" element={<ServicesMairie />} />
      {/* Phase 1 — Routes publiques CDC V4 */}
      <Route path="/mairie-plus" element={<MairePlus />} />
      <Route path="/sponsor" element={<Sponsor />} />
      <Route path="/onboarding-interets" element={<OnboardingInterets />} />
      <Route path="/mon-dashboard" element={<MonDashboard />} />
      {/* Phase 2 — B2B WIINUP */}
      <Route path="/b2b" element={<B2B />} />
      <Route path="/b2b/besoins" element={<B2BBesoins />} />
      <Route path="/b2b/introductions" element={<B2BIntroductions />} />
      <Route path="/b2b/prospection" element={<B2BProspection />} />
      {/* Phase 2 — Marketplace */}
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/marketplace/listing/:id" element={<MarketplaceListingPage />} />
      {/* Phase 2 — Rencontres */}
      <Route path="/rencontres" element={<Rencontres />} />
      <Route path="/flash-date" element={<FlashDate />} />
      <Route path="*" element={<PageNotFound />} />
    </Route>

    {/* Routes internes — mairie + admin */}
    <Route element={<InternalLayout />}>
      <Route path="/mairie/tableau-de-bord" element={<TableauDeBord />} />
      <Route path="/mairie/dossiers" element={<Dossiers />} />
      <Route path="/mairie/dossiers/:id" element={<DossierDetail />} />
      <Route path="/mairie/place-du-village" element={<MairePlaceVillage />} />
      <Route path="/mairie/preuves" element={<Preuves />} />
      <Route path="/mairie/parametres" element={<Parametres />} />
      <Route path="/mairie/evenements" element={<Evenements />} />
      {/* Phase 1 — Routes mairie CDC V4 */}
      <Route path="/mairie/digest" element={<Digest />} />
      <Route path="/mairie/sponsors" element={<SponsorsMairie />} />
      {/* Phase 2 — Rapport de mandat */}
      <Route path="/mairie/rapport-mandat" element={<RapportMandat />} />
      {/* Routes admin */}
      <Route path="/admin/collectivites" element={<Collectivites />} />
      <Route path="/admin/monitoring" element={<Monitoring />} />
      {/* Phase 1 — Routes admin CDC V4 */}
      <Route path="/admin/revenue" element={<Revenue />} />
      <Route path="/admin/ia-usage" element={<IAUsage />} />
    </Route>
  </Routes>
  </Suspense>
  );
  };


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
          <Suspense fallback={null}>
            <CookieBanner />
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
