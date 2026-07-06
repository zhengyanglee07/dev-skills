// Type definitions for the Spaces preview UI. These mirror the JSON shape
// produced by scripts/update_index.py and the individual work-item JSON files
// (described in references/schema.md). Optional fields are marked with `?`.

export type WorkType =
  | 'plan'
  | 'epic'
  | 'task'
  | 'bug'
  | 'improvement'
  | 'sub-task'
  | 'action'
  | 'backlog';

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface IndexEntry {
  id: string;
  type: WorkType;
  title: string;
  status: string;
  priority?: Priority;
  path: string;             // relative to project root, e.g. "Spaces/Task/TASK-001-foo.json"
  parent_id?: string;
  plan_id?: string;
  tags?: string[];
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  converted_at?: string;
}

export interface DocEntry {
  id: string;
  title: string;
  created_at?: string;
  tags?: string[];
  related_items?: string[];
  source?: string;
  path: string;             // relative, e.g. "Spaces/Docs/DOC-001-foo.md"
  subfolder?: string;       // "" for top-level, "Report" for Docs/Report/*
  size_bytes?: number;
}

export interface BusinessPlanEntry {
  id: string;
  title: string;
  path: string;             // relative, e.g. "Spaces/BusinessPlan/BP-001-foo/journey.md"
  folder?: string;          // "" for top-level, "BP-001-foo" for subfolders
  filename: string;
  phase?: string;
  status?: string;
  client?: string;
  owner?: string;
  created_at?: string;
}

export interface IndexWarning {
  path: string;             // file the warning refers to
  kind: string;             // e.g. "missing_fields", "bad_id", "test_coverage_gap"
  message: string;
}

export interface IndexFile {
  schema_version: 1;
  generated_at: string;
  counts_by_type: Record<string, number>;
  counts_by_status: Record<string, number>;
  items: IndexEntry[];
  docs: DocEntry[];
  business_plans: BusinessPlanEntry[];
  warnings: IndexWarning[];
}

// --- Full work-item shape (loaded on demand when a user opens an item) ---

export interface VerificationCriterion {
  // index 0..N is implied by array position
  // text is the criterion itself
  [k: string]: unknown;
}

export interface ExpectedOutcome {
  label?: string;
  expected?: string;
  actual?: string;
  met?: boolean | null;
  verified_at?: string;
  notes?: string;
  [k: string]: unknown;
}

export interface AutomatedTest {
  id?: string;
  status?: 'passing' | 'failing' | 'skipped' | string;
  last_result?: string;
  criterion_index?: number;
  criterion?: string;
  command?: string;
  test_file?: string;
  test_name?: string;
  last_run_at?: string;
  notes?: string;
  [k: string]: unknown;
}

export interface FixAttempt {
  attempt: number;
  outcome?: 'fixed' | 'failed' | 'partial' | 'open' | string;
  started_at?: string;
  ended_at?: string;
  hypothesis?: string;
  approach?: string;
  failure_reason?: string;
  lesson?: string;
  [k: string]: unknown;
}

export interface Commit {
  sha?: string;
  short_sha?: string;
  branch?: string;
  committed_at?: string;
  message?: string;
  [k: string]: unknown;
}

export interface StatusHistoryEntry {
  at: string;
  transition: string;
  from?: string;
  to: string;
  note?: string;
  [k: string]: unknown;
}

export interface Decision {
  id?: string;
  topic?: string;
  at?: string;
  made_by?: string;
  decision: string;
  rationale?: string;
  alternatives?: string[];
  supersedes?: string;
  superseded_by?: string;
  [k: string]: unknown;
}

export interface Note {
  kind?: string;
  at?: string;
  body: string;
  [k: string]: unknown;
}

export interface ClarificationQuestion {
  id?: string;
  asked_at?: string;
  question: string;
  answer?: string | null;
  answered_at?: string;
  [k: string]: unknown;
}

export interface WorkItem {
  schema_version?: 1;
  id: string;
  type: WorkType;
  title: string;
  status: string;
  priority?: Priority;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  converted_at?: string;

  description?: string;
  tags?: string[];

  parent_id?: string;
  plan_id?: string;
  blocks?: string[];
  blocked_by?: string[];
  related_to?: string[];
  converted_to?: string;

  // backlog
  what_is_unclear?: string;
  clarification_questions?: ClarificationQuestion[];
  intended_type?: string;

  // code-producing
  verification_criteria?: (string | VerificationCriterion)[];
  expected_outcomes?: ExpectedOutcome[];
  automated_tests?: AutomatedTest[];
  fix_attempts?: FixAttempt[];
  affected_files?: string[];

  // lifecycle
  solution_summary?: string;
  commits?: Commit[];
  status_history?: StatusHistoryEntry[];
  decisions?: Decision[];
  notes?: Note[];

  // plan
  plan_body?: string;
  approved_by?: string;
  approved_at?: string;

  // children (derived — included in the JSON for convenience)
  children_meta?: { id: string; title?: string; type?: string; status?: string }[];

  [k: string]: unknown;
}

export interface IndexStatusResponse {
  index_exists: boolean;
  index_age_seconds: number | null;
  item_count: number;
  doc_count: number;
  plan_count: number;
  warning_count: number;
  counts_by_type?: Record<string, number>;
  counts_by_status?: Record<string, number>;
  generated_at?: string;
  parse_error?: boolean;
}
