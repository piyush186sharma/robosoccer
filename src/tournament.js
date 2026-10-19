export function createInitialTournament() {
  return {
    name: "ROBOTRON RoboSoccer",
    updatedAt: new Date().toISOString(),
    rounds: [{ id: "round-1", name: "Round 1", published: false, matches: [], byes: [] }],
  };
}

export function createRound(number) {
  return {
    id: `round-${number}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Round ${number}`,
    published: false,
    matches: [],
    byes: [],
  };
}

export function createMatch(roundId, number) {
  return {
    id: `${roundId}-match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    number,
    teamA: "",
    teamB: "",
    date: "",
    time: "",
    venue: "Main Arena",
    status: "scheduled",
    scoreA: "",
    scoreB: "",
    winner: "",
  };
}

export function normalizeTournament(data) {
  if (!data) return createInitialTournament();

  // Convert rounds object/array safely
  const roundsData = data.rounds 
    ? (Array.isArray(data.rounds) ? data.rounds : Object.values(data.rounds))
    : [];

  return {
    name: data.name || "ROBOTRON RoboSoccer",
    updatedAt: data.updatedAt || new Date().toISOString(),
    rounds: roundsData.map((round, index) => {
      // Convert matches object/array safely
      const matchesData = round.matches
        ? (Array.isArray(round.matches) ? round.matches : Object.values(round.matches))
        : [];

      // Convert byes object/array safely
      const byesData = round.byes
        ? (Array.isArray(round.byes) ? round.byes : Object.values(round.byes))
        : [];

      return {
        id: round.id || `round-${index + 1}`,
        name: round.name || `Round ${index + 1}`,
        published: Boolean(round.published),
        matches: matchesData,
        byes: byesData,
      };
    }),
  };
}
  
