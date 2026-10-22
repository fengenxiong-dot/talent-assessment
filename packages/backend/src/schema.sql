-- 人才盘点系统 — 数据库建表语句
-- 目标数据库: PostgreSQL (Supabase / 阿里云 RDS)

-- 1. 用户表（钉钉用户映射）
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dingtalk_id VARCHAR(64)  NOT NULL UNIQUE,
  name        VARCHAR(128) NOT NULL,
  avatar      VARCHAR(512),
  job_number  VARCHAR(64),
  department_ids JSONB NOT NULL DEFAULT '[]',
  department_names JSONB NOT NULL DEFAULT '[]',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  synced_at   TIMESTAMPTZ,
  is_admin    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_job_number_unique
  ON users(job_number) WHERE job_number IS NOT NULL AND job_number <> '';

-- 2. 问卷表
CREATE TABLE IF NOT EXISTS questionnaires (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(256) NOT NULL,
  description  TEXT,
  status       VARCHAR(16)  NOT NULL DEFAULT 'draft',
  created_by   UUID         NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. 大维度表
CREATE TABLE IF NOT EXISTS dimensions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID        NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  name             VARCHAR(256) NOT NULL,
  sort_order       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dimensions_questionnaire ON dimensions(questionnaire_id);

-- 4. 子指标表（含分级描述和权重）
CREATE TABLE IF NOT EXISTS indicators (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id UUID          NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
  name         VARCHAR(256)  NOT NULL,
  weight       DECIMAL(5,2)  NOT NULL,
  sort_order   INT           NOT NULL DEFAULT 0,
  level_desc   JSONB         NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_indicators_dimension ON indicators(dimension_id);

-- 5. 评价关系表
CREATE TABLE IF NOT EXISTS evaluation_relations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID         NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  target_id         UUID         NOT NULL REFERENCES users(id),
  evaluator_id      UUID         NOT NULL REFERENCES users(id),
  evaluator_weight  DECIMAL(4,2) NOT NULL DEFAULT 100.00,
  status            VARCHAR(16)  NOT NULL DEFAULT 'pending',
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(questionnaire_id, target_id, evaluator_id)
);
CREATE INDEX IF NOT EXISTS idx_relations_questionnaire ON evaluation_relations(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_relations_evaluator   ON evaluation_relations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_relations_target      ON evaluation_relations(target_id);

-- 6. 评分明细表
CREATE TABLE IF NOT EXISTS scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_id  UUID        NOT NULL REFERENCES evaluation_relations(id) ON DELETE CASCADE,
  indicator_id UUID        NOT NULL REFERENCES indicators(id),
  score        DECIMAL(3,2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(relation_id, indicator_id)
);
CREATE INDEX IF NOT EXISTS idx_scores_relation   ON scores(relation_id);
CREATE INDEX IF NOT EXISTS idx_scores_indicator  ON scores(indicator_id);

-- 7. 钉钉 access_token 缓存表
CREATE TABLE IF NOT EXISTS dingtalk_token (
  id           INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
