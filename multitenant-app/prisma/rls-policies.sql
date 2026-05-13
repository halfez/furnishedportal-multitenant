-- =====================================================================
-- FurnishedPortal Multi-tenant — Row Level Security policies
-- =====================================================================
-- Run ONCE after the initial Prisma migration:
--   psql $DATABASE_URL -f prisma/rls-policies.sql
--
-- What this does:
--   1. Enables RLS on every customer-data table (all tables with landlordId).
--   2. Adds a policy on each table: landlord_id must equal the session GUC
--      `app.landlord_id`.  When the GUC is not set the function returns NULL
--      and the USING clause evaluates to NULL (not TRUE), so no rows pass.
--   3. FORCE ROW LEVEL SECURITY ensures the policy applies even to the
--      table owner (the Neon role used by the application).
--
-- How the app sets the GUC:
--   Every tenant-scoped query goes through landlordPrisma() in
--   lib/landlord-context.ts which wraps each operation in a short-lived
--   transaction and executes:
--     SET LOCAL app.landlord_id = '<landlordId>';
--   before the query.  SET LOCAL scopes the GUC to the transaction, which
--   is safe with connection pooling (Neon serverless / PgBouncer).
--
-- Platform-level operations (creating Landlord rows, webhook handlers,
-- seed script) use platformPrisma which sets the GUC to the special
-- sentinel value 'PLATFORM' — the platform_bypass policy allows this.
-- =====================================================================

-- ---------------------------------------------------------------
-- Helper: enable RLS + add tenant isolation policy
-- ---------------------------------------------------------------
-- We define one policy per table.  The policy name is fixed so re-running
-- this script is idempotent (DROP POLICY IF EXISTS before CREATE).

-- Subscription
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Subscription";
CREATE POLICY landlord_isolation ON "Subscription"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- OnboardingResponse
ALTER TABLE "OnboardingResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingResponse" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "OnboardingResponse";
CREATE POLICY landlord_isolation ON "OnboardingResponse"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- User (landlord admin users)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "User";
CREATE POLICY landlord_isolation ON "User"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Property
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Property";
CREATE POLICY landlord_isolation ON "Property"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Unit
ALTER TABLE "Unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Unit";
CREATE POLICY landlord_isolation ON "Unit"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- HouseRule
ALTER TABLE "HouseRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HouseRule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "HouseRule";
CREATE POLICY landlord_isolation ON "HouseRule"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Amenity
ALTER TABLE "Amenity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Amenity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Amenity";
CREATE POLICY landlord_isolation ON "Amenity"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- LeaseTemplate
ALTER TABLE "LeaseTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaseTemplate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "LeaseTemplate";
CREATE POLICY landlord_isolation ON "LeaseTemplate"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- ContactSubmission
ALTER TABLE "ContactSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactSubmission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "ContactSubmission";
CREATE POLICY landlord_isolation ON "ContactSubmission"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Booking
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Booking";
CREATE POLICY landlord_isolation ON "Booking"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- FaqCategory
ALTER TABLE "FaqCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FaqCategory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "FaqCategory";
CREATE POLICY landlord_isolation ON "FaqCategory"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Application
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Application";
CREATE POLICY landlord_isolation ON "Application"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Tenant
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Tenant";
CREATE POLICY landlord_isolation ON "Tenant"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- GalleryImage
ALTER TABLE "GalleryImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GalleryImage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "GalleryImage";
CREATE POLICY landlord_isolation ON "GalleryImage"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Payment
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS landlord_isolation ON "Payment";
CREATE POLICY landlord_isolation ON "Payment"
  USING (
    "landlordId" = current_setting('app.landlord_id', true)::text
    OR current_setting('app.landlord_id', true) = 'PLATFORM'
  );

-- Landlord table: NOT protected by RLS (it IS the root tenant registry).
-- Platform-level reads happen unscoped (webhook handlers, middleware lookup).
-- No sensitive data lives only on the Landlord row that isn't also guarded
-- elsewhere (BYO Stripe keys are encrypted at rest).

-- ---------------------------------------------------------------
-- Verify (output should list all 14 tables with rls_enabled = true)
-- ---------------------------------------------------------------
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'Subscription', 'OnboardingResponse', 'User', 'Property', 'Unit',
    'HouseRule', 'Amenity', 'LeaseTemplate', 'ContactSubmission',
    'Booking', 'FaqCategory', 'Application', 'Tenant',
    'GalleryImage', 'Payment'
  )
ORDER BY tablename;
