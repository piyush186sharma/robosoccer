import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Cpu,
  Gauge,
  KeyRound,
  LogOut,
  Plus,
  Radio,
  Settings2,
  Shield,
  Trophy,
  X,
} from "lucide-react";
import {
  databaseConfigured,
  saveTournament,
  storageMode,
  subscribeToTournament,
  verifyAdminCode,
} from "./firebase.js";
import { createInitialTournament, createMatch, createRound, normalizeTournament } from "./tournament.js";

const cardMotion = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

const gridMotion = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

function formatDate(date) {
  if (!date) return "Time TBA";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "Time TBA"
    : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
}

function FixtureCard({ match, onEdit, onDelete }) {
  const winner = match.winner === "A" ? "A" : match.winner === "B" ? "B" : "";
  return (
    <motion.article
      className={`fixture-card ${match.status === "live" ? "is-live" : ""}`}
      variants={cardMotion}
      layout
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <div className="fixture-meta">
        <span className="fixture-id">MATCH {String(match.number).padStart(2, "0")}</span>
        <span className={`status-pill ${match.status}`}>
          {match.status === "live" && <span className="live-dot" />}
          {match.status === "scheduled" ? "UP NEXT" : match.status.toUpperCase()}
        </span>
      </div>
      <div className="fixture-teams">
        {[["A", match.teamA], ["B", match.teamB]].map(([side, team]) => (
          <div className={`fixture-team ${winner === side ? "winner" : ""}`} key={side}>
            <span className="team-mark">{team.slice(-2).toUpperCase()}</span>
            <span className="team-name">{team}</span>
            {match.status !== "scheduled" && <strong className="team-score">{match[`score${side}`] || "0"}</strong>}
          </div>
        ))}
      </div>
      <div className="fixture-footer">
        <span><CalendarDays size={13} /> {formatDate(match.date)}</span>
        <span><Clock3 size={13} /> {match.time || "TBA"}</span>
        {match.venue && <span>{match.venue}</span>}
      </div>
      {onEdit && <div className="card-actions">
        <button className="card-edit" type="button" onClick={() => onEdit(match)}><Settings2 size={14} /> Edit</button>
        {onDelete && <button className="card-delete" type="button" onClick={() => onDelete(match)} aria-label={`Delete match ${match.number}`}><X size={14} /></button>}
      </div>}
    </motion.article>
  );
}

function MatchEditor({ match, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...match });
  const [error, setError] = useState("");
  const setField = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));

  function submit(event) {
    event.preventDefault();
    if (!draft.teamA.trim() || !draft.teamB.trim()) {
      setError("Enter both team names before saving this fixture.");
      return;
    }
    if (draft.status === "completed") {
      if (draft.scoreA === "" || draft.scoreB === "") {
        setError("Enter both scores for a completed match.");
        return;
      }
      if (!draft.winner) {
        setError("Choose the winning team to save the result.");
        return;
      }
    }
    onSave({
      ...draft,
      teamA: draft.teamA.trim(),
      teamB: draft.teamB.trim(),
      scoreA: draft.status === "scheduled" ? "" : draft.scoreA,
      scoreB: draft.status === "scheduled" ? "" : draft.scoreB,
      winner: draft.status === "completed" ? draft.winner : "",
    });
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.985 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        <div className="modal-topline"><span>FIXTURE CONTROL // MATCH {String(match.number).padStart(2, "0")}</span><button onClick={onClose} aria-label="Close editor"><X size={18} /></button></div>
        <h2 id="editor-title">{match.isNew ? "Add a match" : "Edit match"} <span>#{String(match.number).padStart(2, "0")}</span></h2>
        <p className="modal-subtitle">Set the teams and match details. Published changes appear on the live fixture board.</p>
        <form onSubmit={submit}>
          <div className="form-grid team-grid">
            <label>TEAM A<input value={draft.teamA} onChange={setField("teamA")} required maxLength={40} placeholder="Team name" /></label>
            <label>TEAM B<input value={draft.teamB} onChange={setField("teamB")} required maxLength={40} placeholder="Team name" /></label>
          </div>
          <div className="form-grid">
            <label>DATE<input type="date" value={draft.date} onChange={setField("date")} /></label>
            <label>START TIME<input type="time" value={draft.time} onChange={setField("time")} /></label>
          </div>
          <label>VENUE<input value={draft.venue} onChange={setField("venue")} maxLength={50} placeholder="Main Arena" /></label>
          <div className="form-grid score-grid">
            <label>MATCH STATUS<select value={draft.status} onChange={setField("status")}><option value="scheduled">Scheduled</option><option value="live">Live now</option><option value="completed">Completed</option></select></label>
            <label>RESULT SCORE<div className="score-inputs"><input type="number" min="0" placeholder="A" value={draft.scoreA} onChange={setField("scoreA")} disabled={draft.status === "scheduled"} /><span>:</span><input type="number" min="0" placeholder="B" value={draft.scoreB} onChange={setField("scoreB")} disabled={draft.status === "scheduled"} /></div></label>
          </div>
          {draft.status === "completed" && <label>WINNER<select value={draft.winner} onChange={setField("winner")} required><option value="">Select match winner</option><option value="A">{draft.teamA || "Team A"}</option><option value="B">{draft.teamB || "Team B"}</option></select></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button-primary" type="submit"><Check size={16} /> Save fixture</button></div>
        </form>
      </motion.section>
    </motion.div>
  );
}

function AdminLogin({ onLogin, databaseReady, onBack }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Enter the admin access code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const accepted = await onLogin(code.trim());
      if (!accepted) {
        setError("That admin code does not match. Check the code and try again.");
      }
    } catch (loginError) {
      setError(loginError.message || "Could not verify the admin code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.main className="login-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <motion.div className="login-card" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <a className="brand login-brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-icon"><Cpu size={22} /></span>
          <span className="brand-copy"><strong>ROBOTRON</strong><small>ROBO SOCCER / ADMIN ACCESS</small></span>
        </a>
        <div className="login-emblem"><KeyRound size={21} /></div>
        <div className="eyebrow"><span /> RESTRICTED CONSOLE</div>
        <motion.h1 initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.35 }}>Admin <em>sign in.</em></motion.h1>
        <p className="login-description">Enter the access code provided by the tournament owner to manage fixtures and match results.</p>
        <div className="login-warning">Convenience screen lock only: the code is readable from the public database and does not protect database writes.</div>
        {!databaseReady && <div className="login-warning">Connect the Firebase Realtime Database before admin code sign-in can work.</div>}
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="admin-code">ADMIN ACCESS CODE</label>
          <input
            autoComplete="one-time-code"
            id="admin-code"
            maxLength={256}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter your access code"
            type="password"
            value={code}
          />
          <AnimatePresence mode="wait">{error && <motion.p className="login-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{error}</motion.p>}</AnimatePresence>
          <button className="button-primary" type="submit"           disabled={submitting || !databaseReady}>
            <Shield size={15} /> {submitting ? "VERIFYING CODE..." : "SIGN IN"} <ArrowRight size={15} />
          </button>
        </form>
        <button className="login-back" type="button" onClick={onBack}><ArrowRight size={13} /> BACK TO LIVE FIXTURES</button>
        <div className="login-foot"><Shield size={13} /> CODE CHECKED AGAINST REALTIME DATABASE</div>
      </motion.div>
    </motion.main>
  );
}

function App() {
  const [tournament, setTournament] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState("round-1");
  const [view, setView] = useState("fixtures");
  const [editingMatch, setEditingMatch] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [byeInput, setByeInput] = useState("");
  const [roundNameInput, setRoundNameInput] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  async function handleAdminLogin(code) {
    const accepted = await verifyAdminCode(code);
    if (!accepted) return false;
    setAdminAuthenticated(true);
    setView("admin");
    return true;
  }

  useEffect(() => subscribeToTournament((data) => {
    if (data?.rounds?.length) {
      setTournament(normalizeTournament(data));
      return;
    }
    setTournament(createInitialTournament());
  }, (error) => setConnectionError(error.message)), []);

  const rounds = tournament?.rounds || [];
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) || rounds[0];
  const roundMatches = selectedRound?.matches || [];
  const publishedRounds = rounds.filter((round) => round.published);
  const publishedMatches = publishedRounds.flatMap((round) => round.matches);
  const liveMatches = publishedMatches.filter((match) => match.status === "live");
  const completedMatches = publishedMatches.filter((match) => match.status === "completed");
  const dashboardRound = publishedRounds.find((round) => round.id === selectedRoundId) || publishedRounds[0];
  const visibleMatches = useMemo(() => dashboardRound?.matches || [], [dashboardRound]);

  async function commit(update) {
    if (!tournament) return;
    const updatedTournament = { ...update(tournament), updatedAt: new Date().toISOString() };
    setTournament(updatedTournament);
    setSaving(true);
    setConnectionError("");
    try {
      await saveTournament(updatedTournament);
    } catch (error) {
      setConnectionError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function saveMatch(updatedMatch) {
    commit((current) => ({
      ...current,
      rounds: current.rounds.map((round) => round.id !== selectedRound.id ? round : {
        ...round,
        matches: updatedMatch.isNew
          ? [...round.matches, { ...updatedMatch, isNew: undefined }]
          : round.matches.map((match) => match.id === updatedMatch.id ? updatedMatch : match),
      }),
    }));
    setEditingMatch(null);
  }

  function addMatch() {
    if (!selectedRound) return;
    const match = createMatch(selectedRound.id, selectedRound.matches.length + 1);
    setEditingMatch({ ...match, isNew: true });
  }

  function deleteMatch(match) {
    if (!window.confirm(`Delete Match ${String(match.number).padStart(2, "0")}?`)) return;
    commit((current) => ({
      ...current,
      rounds: current.rounds.map((round) => round.id !== selectedRound.id ? round : {
        ...round,
        matches: round.matches.filter((item) => item.id !== match.id)
          .map((item, index) => ({ ...item, number: index + 1 })),
      }),
    }));
  }

  function publishRound() {
    if (!selectedRound) return;
    if (!roundMatches.length && !selectedRound.byes.length) {
      setConnectionError("Add at least one match or bye team before publishing this round.");
      return;
    }
    if (roundMatches.some((match) => !match.teamA?.trim() || !match.teamB?.trim())) {
      setConnectionError("Every fixture needs both team names before the round can be published.");
      return;
    }
    commit((current) => ({
      ...current,
      rounds: current.rounds.map((round) => round.id === selectedRound.id ? { ...round, published: true } : round),
    }));
  }

  function addRound(event) {
    event.preventDefault();
    if (!selectedRound?.published) {
      setConnectionError("Publish this round before adding the next round.");
      return;
    }
    let defaultNameNumber = rounds.length + 1;
    while (rounds.some((round) => round.name.toLowerCase() === `round ${defaultNameNumber}`.toLowerCase())) {
      defaultNameNumber += 1;
    }
    const name = roundNameInput.trim() || `Round ${defaultNameNumber}`;
    if (rounds.some((round) => round.name.toLowerCase() === name.toLowerCase())) {
      setConnectionError("A round with that name already exists.");
      return;
    }
    const newRound = { ...createRound(rounds.length + 1), name };
    commit((current) => ({ ...current, rounds: [...current.rounds, newRound] }));
    setSelectedRoundId(newRound.id);
    setRoundNameInput("");
  }

  function addBye(event) {
    event.preventDefault();
    const team = byeInput.trim();
    if (!team || !selectedRound) return;
    if (selectedRound.byes.some((bye) => bye.toLowerCase() === team.toLowerCase())) {
      setConnectionError(`${team} is already in this round's byes.`);
      return;
    }
    commit((current) => ({
      ...current,
      rounds: current.rounds.map((round) => round.id === selectedRound.id ? { ...round, byes: [...round.byes, team] } : round),
    }));
    setByeInput("");
  }

  function removeBye(team) {
    commit((current) => ({
      ...current,
      rounds: current.rounds.map((round) => round.id === selectedRound.id ? { ...round, byes: round.byes.filter((bye) => bye !== team) } : round),
    }));
  }

  function renameRound(event) {
    const name = event.target.value.trim();
    if (!name || name === selectedRound.name) return;
    if (rounds.some((round) => round.id !== selectedRound.id && round.name.toLowerCase() === name.toLowerCase())) {
      setConnectionError("A round with that name already exists.");
      return;
    }
    commit((current) => ({
      ...current,
      rounds: current.rounds.map((round) => round.id === selectedRound.id ? { ...round, name } : round),
    }));
  }

  function resetTournament() {
    if (!window.confirm("Remove all rounds, matches, results, and bye teams?")) return;
    const initial = createInitialTournament();
    setTournament(initial);
    setSelectedRoundId(initial.rounds[0].id);
    saveTournament(initial).catch((error) => setConnectionError(error.message));
  }

  if (view === "admin" && !adminAuthenticated) {
    return <AdminLogin onLogin={handleAdminLogin} databaseReady={databaseConfigured} onBack={() => setView("fixtures")} />;
  }

  return (
    <motion.div className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <motion.div className="ambient-glow" animate={{ scale: [1, 1.08, 1], opacity: [0.09, 0.15, 0.09] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("fixtures"); }}>
          <span className="brand-icon"><Cpu size={22} /></span>
          <span className="brand-copy"><strong>ROBOTRON</strong><small>ROBO SOCCER / TOURNAMENT</small></span>
        </a>
        <div className="nav-caption">TOURNAMENT CONSOLE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <motion.button whileHover={{ x: 3 }} whileTap={{ scale: 0.985 }} className={view === "fixtures" ? "active" : ""} onClick={() => { setView("fixtures"); if (dashboardRound) setSelectedRoundId(dashboardRound.id); }}><Gauge size={17} /><span>Live fixtures</span><ArrowRight className="nav-arrow" size={14} /></motion.button>
          <motion.button whileHover={{ x: 3 }} whileTap={{ scale: 0.985 }} className={view === "admin" ? "active" : ""} onClick={() => { setView("admin"); if (!rounds.some((round) => round.id === selectedRoundId)) setSelectedRoundId(rounds[0]?.id); }}><Settings2 size={17} /><span>Admin control</span></motion.button>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-event"><span className="event-orbit"><Trophy size={18} /></span><div><small>EVENT STATUS</small><strong>{liveMatches.length ? "IN PROGRESS" : "TOURNAMENT READY"}</strong></div><span className="live-dot" /></div>
          <div className="sidebar-foot"><span className="small-orb" /> ROBOTRON SYSTEMS <span>V.25.1</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">ROBOTRON <span>/</span> TOURNAMENT <span>/</span> <b>{view === "fixtures" ? "FIXTURES" : "ADMIN CONTROL"}</b></div>
          <div className="topbar-right"><span className="sync-status"><span className={`status-indicator ${connectionError ? "error" : ""}`} />{connectionError ? "ACTION NEEDED" : saving ? "SYNCING" : storageMode === "firebase" ? "LIVE DATABASE" : "LOCAL PREVIEW"}</span><span className="topbar-divider" />{view === "admin" && adminAuthenticated && <button className="logout-button" onClick={() => { setAdminAuthenticated(false); setView("fixtures"); }}><LogOut size={14} /> SIGN OUT</button>}<span className="operator"><span className="operator-icon"><Shield size={15} /></span> ADMIN</span></div>
        </header>

        {connectionError && <div className="error-banner" role="alert"><span>{connectionError}</span><button onClick={() => setConnectionError("")} aria-label="Dismiss message"><X size={15} /></button></div>}
        <AnimatePresence mode="wait" initial={false}>
        {view === "fixtures" ? (
          <motion.div key="fixtures-view" className="page-wrap" {...pageMotion}>
            <motion.section className="hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
              <div className="hero-copy"><div className="eyebrow"><span /> THE ARENA IS LIVE</div><h1>THE ROAD TO<br /><em>CHAMPION.</em></h1><p>Follow every clash in the ROBOTRON RoboSoccer championship. Matchups and schedules are published by the tournament admin.</p><div className="hero-actions"><button className="button-primary" onClick={() => document.getElementById("fixtures")?.scrollIntoView({ behavior: "smooth" })}><Radio size={15} /> VIEW FIXTURES <ArrowRight size={15} /></button><span className="event-date"><CalendarDays size={15} /> LIVE TOURNAMENT</span></div></div>
              <div className="hero-art" aria-hidden="true"><div className="art-grid" /><motion.div className="orbit orbit-one" animate={{ rotate: [0, 360], scaleY: 0.42 }} transition={{ duration: 46, repeat: Infinity, ease: "linear" }} /><motion.div className="orbit orbit-two" animate={{ rotate: [54, 414], scaleY: 0.42 }} transition={{ duration: 34, repeat: Infinity, ease: "linear" }} /><motion.div className="robot-ball" animate={{ y: [0, -9, 0], rotate: [0, 3, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}><span>R</span></motion.div><div className="art-label">RS<span> // LIVE</span></div><div className="art-coordinate">ROBOTRON<br />TOURNAMENT ARENA</div></div>
              <div className="hero-index">01 <span>/</span> LIVE</div>
            </motion.section>

            <motion.section className="stats-row" aria-label="Tournament statistics" variants={gridMotion} initial="hidden" animate="visible">
              <motion.div className="stat-card" variants={cardMotion}><span className="stat-icon"><Cpu size={16} /></span><span className="stat-label">PUBLISHED ROUNDS</span><strong>{String(publishedRounds.length).padStart(2, "0")}</strong><small>LIVE ON THE FIXTURE BOARD</small></motion.div>
              <motion.div className="stat-card" variants={cardMotion}><span className="stat-icon"><Activity size={16} /></span><span className="stat-label">MATCHES IN PLAY</span><strong>{String(liveMatches.length).padStart(2, "0")}</strong><small>{liveMatches.length ? "LIVE RIGHT NOW" : "AWAITING KICKOFF"}</small></motion.div>
              <motion.div className="stat-card" variants={cardMotion}><span className="stat-icon"><Check size={16} /></span><span className="stat-label">COMPLETED</span><strong>{String(completedMatches.length).padStart(2, "0")}</strong><small>RESULTS LOCKED IN</small></motion.div>
              <motion.div className="stat-card" variants={cardMotion}><span className="stat-icon"><Trophy size={16} /></span><span className="stat-label">PRIZE</span><strong className="prize-stat">THE CUP</strong><small>CLAIM YOUR GLORY</small></motion.div>
            </motion.section>

            <section className="fixtures-section" id="fixtures">
              <div className="section-heading"><div><div className="eyebrow"><span /> PUBLISHED FIXTURES</div><h2>Match <em>schedule</em></h2></div><span className="section-note"><span className="live-dot" /> LIVE UPDATES</span></div>
              {publishedRounds.length ? <>
                <div className="round-tabs" role="tablist" aria-label="Published tournament rounds">
                  {publishedRounds.map((round) => <motion.button whileTap={{ scale: 0.98 }} key={round.id} role="tab" aria-selected={dashboardRound?.id === round.id} className={dashboardRound?.id === round.id ? "selected" : ""} onClick={() => setSelectedRoundId(round.id)}><span>{round.name}</span><small>{round.matches.length} matches · {round.byes.length} byes</small>{dashboardRound?.id === round.id && <motion.i className="round-tab-indicator" layoutId="public-round-indicator" />}</motion.button>)}
                </div>
                <div className="fixtures-heading"><div><span className="heading-accent">◢</span> {dashboardRound?.name.toUpperCase()} <span className="fixture-count">{visibleMatches.length} FIXTURES</span></div><span className="published-indicator"><Check size={12} /> PUBLISHED</span></div>
                {visibleMatches.length ? <motion.div className="fixture-grid" variants={gridMotion} initial="hidden" animate="visible">{visibleMatches.map((match) => <FixtureCard key={match.id} match={match} />)}</motion.div> : <div className="empty-state">No matches in this published round yet. Ask the tournament admin for an update.</div>}
                <AnimatePresence>{!!dashboardRound?.byes.length && <motion.div className="byes-public" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><strong>BYE TEAMS</strong>{dashboardRound.byes.map((team) => <span key={team}>{team}</span>)}</motion.div>}</AnimatePresence>
              </> : <div className="empty-state public-empty"><span className="empty-mark"><Trophy size={21} /></span><strong>Fixtures are being prepared</strong><span>The tournament admin has not published a round yet. Check back soon.</span></div>}
            </section>

            <section className="finals-strip"><div className="finals-cup"><Trophy size={21} /></div><div><span>THE FINISH LINE</span><strong>One champion. Robotron forever.</strong></div><span className="finals-admin-note">Rounds published by tournament control</span></section>
            <footer className="page-footer"><span>© ROBOTRON ROBO SOCCER CHAMPIONSHIP</span><span>BUILT FOR THE LOVE OF THE GAME <span className="footer-cross">✳</span></span></footer>
          </motion.div>
        ) : (
          <motion.div key="admin-view" className="page-wrap admin-page" {...pageMotion}>
            <section className="admin-intro"><div className="eyebrow"><span /> TOURNAMENT OPERATIONS</div><h1>Admin <em>control.</em></h1><p>Create each fixture and round on your terms. Publish when ready; published rounds stay editable for last-minute changes.</p><div className="admin-callout"><Shield size={18} /><span><strong>Operator mode</strong>{storageMode === "firebase" ? "Changes sync to your Firebase Realtime Database and the public fixture board." : "Local preview mode — configure Firebase to share changes across devices."}</span></div></section>
            <section className="admin-toolbar"><div><h2>Round management</h2><p>Add matchups one at a time. The dashboard only shows published rounds.</p></div><button className="button-danger" onClick={resetTournament}><X size={15} /> RESET TOURNAMENT</button></section>
            <div className="round-tabs admin-tabs" role="tablist" aria-label="Select a round to manage">{rounds.map((round) => <motion.button whileTap={{ scale: 0.98 }} key={round.id} role="tab" aria-selected={selectedRound?.id === round.id} className={selectedRound?.id === round.id ? "selected" : ""} onClick={() => setSelectedRoundId(round.id)}><span>{round.name}{round.published && <Check className="tab-check" size={12} />}</span><small>{round.matches.length} matches · {round.published ? "published" : "draft"}</small>{selectedRound?.id === round.id && <motion.i className="round-tab-indicator" layoutId="admin-round-indicator" />}</motion.button>)}</div>
            {selectedRound && <section className="admin-round">
              <div className="admin-round-heading">
                <label className="round-name-field">ROUND NAME<input key={selectedRound.id} defaultValue={selectedRound.name} maxLength={35} onBlur={renameRound} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} /></label>
                <span className={`round-state ${selectedRound.published ? "is-published" : ""}`}>{selectedRound.published ? <><Check size={13} /> PUBLISHED</> : "DRAFT — NOT VISIBLE ON DASHBOARD"}</span>
              </div>
              <div className="admin-round-tools"><div><h2>{selectedRound.name} fixtures</h2><p>Update matchups, dates, kickoff times, scores, and status whenever needed.</p></div><button className="button-primary add-match-button" onClick={addMatch}><Plus size={16} /> ADD MATCH</button></div>
              {roundMatches.length ? <motion.div className="fixture-grid admin-fixtures" variants={gridMotion} initial="hidden" animate="visible">{roundMatches.map((match) => <FixtureCard key={match.id} match={match} onEdit={(item) => setEditingMatch(item)} onDelete={deleteMatch} />)}</motion.div> : <div className="empty-state admin-empty">No matches added to this round yet. Add the first team vs team matchup above.</div>}
              <section className="bye-manager"><div className="bye-heading"><div><h3>Bye teams</h3><p>Record teams advancing without a match in this round.</p></div><span>{selectedRound.byes.length} TEAMS</span></div>
                <form className="bye-form" onSubmit={addBye}><input value={byeInput} onChange={(event) => setByeInput(event.target.value)} maxLength={40} placeholder="Enter team name" aria-label="Team name for bye" required /><button type="submit"><Plus size={15} /> ADD BYE TEAM</button></form>
                <AnimatePresence><motion.div className="bye-chip-list" layout>{selectedRound.byes.map((team) => <motion.span key={team} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>{team}<button onClick={() => removeBye(team)} aria-label={`Remove ${team} from byes`}><X size={12} /></button></motion.span>)}</motion.div></AnimatePresence>
              </section>
              <div className="publish-row"><div><strong>{selectedRound.published ? "Round is live on the dashboard" : "Review your fixtures before publishing"}</strong><span>{selectedRound.published ? "Edits and results are already visible to viewers." : "You can continue making changes after publishing."}</span></div><button className={selectedRound.published ? "button-published" : "button-primary"} onClick={publishRound}>{selectedRound.published ? <><Check size={15} /> UPDATE PUBLISHED ROUND</> : <><Radio size={15} /> PUBLISH ROUND</>}</button></div>
            </section>}
            <form className="next-round-form" onSubmit={addRound}><div><strong>Ready for the next stage?</strong><span>Once this round is published, add the next round and set up its matchups manually.</span></div><input value={roundNameInput} onChange={(event) => setRoundNameInput(event.target.value)} maxLength={35} placeholder={`Round ${rounds.length + 1} (optional name)`} aria-label="Next round name" /><button type="submit" disabled={!selectedRound?.published}><Plus size={15} /> ADD NEXT ROUND</button></form>
            <footer className="page-footer"><span>ADMIN CONTROL // {storageMode === "firebase" ? "FIREBASE RTDB" : "LOCAL STORAGE"}</span><span>Changes appear on published fixtures <span className="footer-cross">✳</span></span></footer>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
      <AnimatePresence>{editingMatch && <MatchEditor key={editingMatch.id} match={editingMatch} onClose={() => setEditingMatch(null)} onSave={saveMatch} />}</AnimatePresence>
    </motion.div>
  );
}

export default App;
