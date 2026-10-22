const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

let authToken: string | null = localStorage.getItem("auth_token");

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// 问卷管理
import type {
  User,
  Questionnaire,
  EvaluationRelation,
  AggregationResult,
  GridCellData,
  ProgressResult,
} from "../types";

export const api = {
  // 认证
  login: (code: string, mockUsername?: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ code, mock_username: mockUsername }),
    }),

  me: () => request<User>("/auth/me"),

  // 问卷
  listQuestionnaires: () =>
    request<Questionnaire[]>("/questionnaires"),

  createQuestionnaire: (data: {
    title: string;
    description?: string;
    dimensions: {
      name: string;
      sort_order: number;
      indicators: {
        name: string;
        weight: number;
        sort_order: number;
        level_desc: Record<string, string>;
      }[];
    }[];
  }) =>
    request<Questionnaire>("/questionnaires", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getQuestionnaire: (id: string) =>
    request<Questionnaire>(`/questionnaires/${id}`),

  publishQuestionnaire: (id: string) =>
    request<Questionnaire>(`/questionnaires/${id}/publish`, {
      method: "PUT",
    }),

  archiveQuestionnaire: (id: string) =>
    request<Questionnaire>(`/questionnaires/${id}/archive`, {
      method: "PUT",
    }),

  // 评价关系
  uploadRelations: (questionnaireId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/questionnaires/${questionnaireId}/relations/upload`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },

  getRelations: (questionnaireId: string) =>
    request<EvaluationRelation[]>(`/questionnaires/${questionnaireId}/relations`),

  pushNotifications: (questionnaireId: string) =>
    request<{ success: boolean; count: number; task_ids: number[] }>(
      `/questionnaires/${questionnaireId}/relations/push`,
      { method: "POST" }
    ),

  // 评分
  getMyEvaluations: (questionnaireId?: string) =>
    request<EvaluationRelation[]>(
      `/my/evaluations${questionnaireId ? `?questionnaire_id=${questionnaireId}` : ""}`
    ),

  getScoreForm: (relationId: string) =>
    request<{
      relation: EvaluationRelation & { questionnaire_title: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dimensions: any[];
    }>(`/my/evaluations/${relationId}`),

  submitScores: (
    relationId: string,
    scores: { indicator_id: string; score: number }[]
  ) =>
    request<{ success: boolean }>(`/my/evaluations/${relationId}/scores`, {
      method: "PUT",
      body: JSON.stringify({ scores }),
    }),

  // 汇总
  getAggregation: (questionnaireId: string) =>
    request<AggregationResult>(`/questionnaires/${questionnaireId}/aggregation`),

  getGrid: (questionnaireId: string, xDim: string, yDim: string) =>
    request<{
      x_dim: string;
      y_dim: string;
      cells: GridCellData[];
    }>(`/questionnaires/${questionnaireId}/grid?x_dim=${encodeURIComponent(xDim)}&y_dim=${encodeURIComponent(yDim)}`),

  // 进度
  getProgress: (questionnaireId: string) =>
    request<ProgressResult>(`/questionnaires/${questionnaireId}/progress`),

  // 通讯录
  searchContacts: (keyword: string) =>
    request<{ users: User[] }>(`/contacts/search?keyword=${encodeURIComponent(keyword)}`),

  syncContacts: () =>
    request<{ success: boolean; departments: number; users: number; message: string }>(
      "/contacts/sync",
      { method: "POST" },
    ),
};
