// Mock document corpus the search/analysis subagent works against — stands
// in for a real search API or vector store. Deliberately includes documents
// that disagree with each other, so synthesis has to actually reconcile
// sources instead of just concatenating them.

export interface Doc {
  id: string;
  title: string;
  source: string;
  topic: "productivity" | "wellbeing" | "implementation";
  body: string;
}

export const CORPUS: Doc[] = [
  {
    id: "doc_01",
    title: "Six-month trial at 61 UK firms: output holds, hours drop",
    source: "4 Day Week Global pilot report, 2023",
    topic: "productivity",
    body: "Across 61 companies running a 4-day week with no pay reduction, self-reported revenue was flat to slightly up (+1.4% average) compared to the same period the prior year, while scheduled hours fell by 20%. Companies attributed output stability to tighter meeting discipline and fewer context switches, not to individuals working harder per hour.",
  },
  {
    id: "doc_02",
    title: "Compressed schedules and deep work: a lab study",
    source: "Organizational Behavior quarterly, 2022",
    topic: "productivity",
    body: "In a controlled setting, knowledge workers given a compressed 4-day schedule showed a 12% increase in tasks requiring sustained focus, but no significant change in throughput for high-interruption tasks like customer support. The effect was concentrated in roles with fewer than 3 scheduled meetings per day.",
  },
  {
    id: "doc_03",
    title: "Manufacturing shift work sees no productivity gain",
    source: "Industrial Relations review, 2023",
    topic: "productivity",
    body: "Among manufacturing employers running compressed schedules, per-shift output was unchanged and overtime costs rose 8%, since machine-paced work cannot absorb the same 'fewer interruptions' benefit knowledge work sees. The productivity gains reported elsewhere appear concentrated in white-collar, meeting-heavy roles.",
  },
  {
    id: "doc_04",
    title: "Burnout scores drop, but not for everyone",
    source: "Occupational Health survey, 2023",
    topic: "wellbeing",
    body: "Self-reported burnout (Maslach Burnout Inventory) fell 27% on average after 6 months on a 4-day schedule. The improvement was smallest among employees who reported their workload was simply compressed into 4 days rather than genuinely reduced — for that subgroup, burnout scores were statistically unchanged.",
  },
  {
    id: "doc_05",
    title: "Care responsibilities and the extra day off",
    source: "Family & Work policy brief, 2022",
    topic: "wellbeing",
    body: "Employees with primary caregiving responsibilities reported the largest wellbeing gains from an extra weekday off, citing reduced need for paid childcare and more flexibility for medical appointments. Employees without caregiving responsibilities reported smaller, though still positive, wellbeing effects.",
  },
  {
    id: "doc_06",
    title: "Rollout failures: what the pilots that reverted have in common",
    source: "Future of Work working paper, 2023",
    topic: "implementation",
    body: "Of pilot programs that reverted to a 5-day week within a year, the common factor was not employee dissatisfaction but client-facing coverage gaps — teams hadn't redesigned handoff processes, so customer response times degraded on the day off. Programs that explicitly redesigned coverage before launch had a substantially lower reversion rate.",
  },
];

export function search(query: string): { id: string; title: string; source: string; topic: string; snippet: string }[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return CORPUS.filter((doc) => {
    const haystack = `${doc.title} ${doc.body} ${doc.topic}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }).map((doc) => ({
    id: doc.id,
    title: doc.title,
    source: doc.source,
    topic: doc.topic,
    snippet: doc.body.slice(0, 140) + "...",
  }));
}

export function getDocument(id: string): Doc | undefined {
  return CORPUS.find((doc) => doc.id === id);
}
