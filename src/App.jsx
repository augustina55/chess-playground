import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { exchangeLichessCode } from "./utils/lichess";
import { getAcademies } from "./lib/db";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import BatchesPage from "./pages/BatchesPage";
import BlitzRacePage from "./pages/BlitzRacePage";
import HomeworkPage from "./pages/HomeworkPage";
import PgnCenterPage from "./pages/PgnCenterPage";
import AdminPage from "./pages/AdminPage";
import AcademyPage from "./pages/AcademyPage";
import ActivityPage from "./pages/ActivityPage";
import ClassNotesPage from "./pages/ClassNotesPage";
import LearnPage from "./pages/LearnPage";
import PlayPage from "./pages/PlayPage";
import AnalysePage from "./pages/AnalysePage";
import ProfilePage from "./pages/ProfilePage";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./App.css";

function MainApp() {
  const { user, updateUser } = useAuth();
  const [page, setPage] = useState("home");
  const [showProfile, setShowProfile] = useState(false);

  // Load academy name + logo for the current user on login so Header shows it immediately
  useEffect(() => {
    if (!user || user.role === "admin") return;
    getAcademies().then(all => {
      let ac = null;
      if (user.role === "coach" || user.role === "academy")
        ac = all.find(a => String(a.mainCoachId) === String(user.id));
      if (user.role === "student") ac = all.find(a => String(a.id) === String(user.academyId));
      if (!ac) return;
      if (ac.name) localStorage.setItem("ca_academy_name", ac.name);
      if (ac.logo) localStorage.setItem("ca_academy_logo", ac.logo);
      window.dispatchEvent(new CustomEvent("ca-logo-update"));
    }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code && user) {
      window.history.replaceState({}, "", window.location.pathname);
      exchangeLichessCode(code).then((lichessId) => {
        if (lichessId) {
          updateUser({ lichessId });
          setShowProfile(true);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <LoginPage />;

  return (
    <div className="h-screen overflow-hidden bg-[#f8f1e8]" style={{ background: "linear-gradient(180deg, #f3e8d9 0%, #f8f1e8 100%)" }}>
      <div className="flex h-screen w-full overflow-hidden border-2 border-[#1a140f] bg-[#fff8ef] shadow-[0_18px_0_#1a140f,0_26px_48px_rgba(25,20,15,0.16)]">
        <Sidebar
          active={page}
          onNav={setPage}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            onProfile={() => setShowProfile(true)}
            currentPage={page}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="page-enter">
              {page === "home"       && <HomePage onNav={setPage} />}
              {page === "batches"    && <BatchesPage />}
              {page === "blitz-race" && <BlitzRacePage />}
              {page === "homework"   && <HomeworkPage />}
              {page === "pgn-center" && <PgnCenterPage />}
              {page === "activity"    && <ActivityPage />}
              {page === "play"        && <PlayPage />}
              {page === "analyse"     && <AnalysePage />}
              {page === "learn"       && <LearnPage />}
              {page === "class-notes" && <ClassNotesPage />}
{page === "academy"    && (user?.role === "admin" || user?.role === "academy") && <AcademyPage />}
              {page === "admin"      && user?.role === "admin" && <AdminPage />}
            </div>
          </main>
        </div>
      </div>

      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setShowProfile(false)} />
          <div className="relative z-10 h-full">
            <ProfilePage onBack={() => setShowProfile(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
