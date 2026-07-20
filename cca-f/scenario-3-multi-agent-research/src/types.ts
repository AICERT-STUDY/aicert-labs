export interface Finding {
  claim: string;
  documentId: string;
  source: string;
}

// What a research subagent hands back to the coordinator: a compact,
// structured result. Notably absent: the subagent's tool-call transcript
// (every search query, every document it read and rejected). The coordinator
// never sees that — see the README's "why the coordinator only gets this" section.
export interface SubtopicResearch {
  subtopic: string;
  findings: Finding[];
}
