export interface Person {
  user_id?: string;
  name: string;
  groups: Record<string, string>;
  scores: Record<string, number>;
  dimension_scores: Record<string, number>;
}

export type ScoreLevel = "低" | "中" | "高";

export interface GridCellData {
  xLevel: ScoreLevel;
  yLevel: ScoreLevel;
  label: string;
  people: Person[];
}

// ===== 新系统类型 =====

export interface User {
  id: string;
  name: string;
  dingtalk_id: string;
  avatar?: string;
  is_admin: boolean;
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  created_by: string;
  published_at?: string;
  created_at: string;
  dimensions: Dimension[];
}

export interface Dimension {
  id: string;
  name: string;
  sort_order: number;
  indicators: Indicator[];
}

export interface Indicator {
  id: string;
  name: string;
  weight: number;
  sort_order: number;
  level_desc: Record<string, string>;
}

export interface EvaluationRelation {
  id: string;
  questionnaire_id: string;
  questionnaire_title?: string;
  target_id: string;
  target_name: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_weight: number;
  status: "pending" | "submitted";
  submitted_at?: string;
}

export interface AggregatedPerson {
  user_id: string;
  name: string;
  dimension_scores: Record<string, number>;
  groups: Record<string, string>;
}

export interface AggregationResult {
  people: AggregatedPerson[];
  dimension_names: string[];
}

export interface ProgressDetail {
  evaluator_name: string;
  target_name: string;
  status: "pending" | "submitted";
  submitted_at?: string;
}

export interface ProgressResult {
  total: number;
  submitted: number;
  percentage: number;
  details: ProgressDetail[];
}
