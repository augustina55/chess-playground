import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { exchangeLichessCode } from "./utils/lichess";
import LoginPage     from "./pages/LoginPage";
import HomePage      from "./pages/HomePage";
import BatchesPage   from "./pages/BatchesPage";
import BlitzRacePage from "./pages/BlitzRacePage";
import HomeworkPage  from "./pages/HomeworkPage";
import PgnCenterPage from "./pages/PgnCenterPage";
import AdminPage     from "./pages/AdminPage";
import AcademyPage   from "./pages/AcademyPage";
import ProfilePage   from "./pages/ProfilePage";
import Sidebar       from "./components/Sidebar";
import Header        from "./components/Header";
import "./App.css";

function MainApp() {
  const { user, updateUser } = useAuth();
  const [page, setPage]               = useState("home");
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch]           = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && user) {
      window.history.replaceState({}, "", window.location.pathname);
      exchangeLichessCode(code).then(lichessId => {
        if (lichessId) { updateUser({ lichessId }); setShowProfile(true); }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <LoginPage />;

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#F4F4F5" }}>
      <Sidebar active={page} onNav={p => { setPage(p); setSearch(""); }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onProfile={() => setShowProfile(true)}
          searchValue={search}
          onSearch={setSearch}
          currentPage={page}
        />
        <main className="flex-1 overflow-y-auto">
          {page === "home"       && <HomePage      onNav={setPage} search={search} />}
          {page === "batches"    && <BatchesPage   search={search} />}
          {page === "blitz-race" && <BlitzRacePage />}
          {page === "homework"   && <HomeworkPage  search={search} />}
          {page === "pgn-center" && <PgnCenterPage search={search} />}
          {page === "academy"    && (user?.role === "admin" || user?.role === "coach") && <AcademyPage search={search} />}
          {page === "admin"      && user?.role === "admin" && <AdminPage search={search} />}
        </main>
      </div>
      {showProfile && <ProfilePage onBack={() => setShowProfile(false)} />}
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
