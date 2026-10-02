-- Apply to auth_db before deploying Identity with spring.jpa.hibernate.ddl-auto=validate.
-- Existing accounts keep NULL created_at because their actual creation time is unknown.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(6) WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP(6) WITH TIME ZONE;
