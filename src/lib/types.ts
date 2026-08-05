export type OrgRole = "admin" | "manager" | "employee";

export type RelationshipType =
  | "self"
  | "manager"
  | "peer"
  | "direct_report"
  | "external";

export type CycleStatus = "draft" | "active" | "closed";

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string | null;
  role: OrgRole;
  manager_id: string | null;
  display_name: string;
  email: string;
  title: string | null;
  department: string | null;
  status: "invited" | "active" | "disabled";
}

export interface ReviewCycle {
  id: string;
  org_id: string;
  name: string;
  status: CycleStatus;
  starts_at: string | null;
  ends_at: string | null;
  min_responses_for_disclosure: number;
}

export interface Competency {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Question {
  id: string;
  org_id: string;
  competency_id: string | null;
  text: string;
  question_type: "rating_1_5" | "rating_1_7" | "text";
  applies_to: RelationshipType[];
  sort_order: number;
}

export interface Assignment {
  id: string;
  cycle_id: string;
  org_id: string;
  reviewee_id: string;
  reviewer_id: string | null;
  relationship_type: RelationshipType;
  status: "pending" | "in_progress" | "submitted";
}

export interface ResultBucket {
  attributed?: boolean;
  locked?: boolean;
  avg_rating: number | null;
  comments: string[];
}

export interface CompetencyResult {
  competency_id: string;
  competency_name: string;
  self: ResultBucket | null;
  manager: ResultBucket | null;
  peer: ResultBucket | null;
  direct_report: ResultBucket | null;
}
