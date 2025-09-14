import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBusinessRuleTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplate";
import type { IAiCommerceBusinessRuleTemplates } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplates";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test retrieving details of a specific business rule template by its ruleId as
 * an admin. This scenario checks: (1) admin join, (2) create a rule template,
 * (3) fetch detail. It verifies full data round-trip and correct audit fields.
 */
export async function test_api_admin_business_rule_template_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and assert authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(adminAuth);

  // 2. Create a new business rule template
  const now = new Date();
  const templateInput = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(3),
    version: typia.random<number & tags.Type<"int32">>(),
    template_data: JSON.stringify({
      logic: RandomGenerator.content({ paragraphs: 2 }),
    }),
    business_status: RandomGenerator.pick([
      "active",
      "retired",
      "archived",
    ] as const),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
  } satisfies IAiCommerceBusinessRuleTemplates.ICreate;
  const created: IAiCommerceBusinessRuleTemplates =
    await api.functional.aiCommerce.admin.businessRuleTemplates.create(
      connection,
      { body: templateInput },
    );
  typia.assert(created);

  // 3. Retrieve rule template detail by its id (UUID)
  const detail: IAiCommerceBusinessRuleTemplate =
    await api.functional.aiCommerce.admin.businessRuleTemplates.at(connection, {
      ruleId: typia.assert<string & tags.Format<"uuid">>(created.id!),
    });
  typia.assert(detail);

  // 4. Validate all important fields (incl. round-trip integrity and audit fields)
  TestValidator.equals("id matches", detail.id, created.id);
  TestValidator.equals("code matches", detail.code, templateInput.code);
  TestValidator.equals("name matches", detail.name, templateInput.name);
  TestValidator.equals(
    "version matches",
    detail.version,
    templateInput.version,
  );
  TestValidator.equals(
    "template_data matches",
    detail.template_data,
    templateInput.template_data,
  );
  TestValidator.equals(
    "business_status matches",
    detail.business_status,
    templateInput.business_status,
  );
  TestValidator.equals(
    "created_at matches",
    detail.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    detail.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    detail.deleted_at,
    created.deleted_at,
  );
}

/**
 * Draft code correctly implements the required admin onboarding, business rule
 * template creation, and detail fetch steps for the
 * /aiCommerce/admin/businessRuleTemplates/{ruleId} GET endpoint as an
 * authenticated admin. All random data is valid and uses proper typia.random
 * and RandomGenerator patterns. Await is present for all API calls. No DTO type
 * confusion or illegal property creation. Deleted_at logic is null (active
 * template). For data checks, TestValidator.equals is used with clear titles as
 * first parameter, actual-first expected-second pattern. Audit and business
 * fields are validated for round-trip integrity. There is no type error test
 * and no forbidden code or import violation. Typia.assert is used properly for
 * every API response. No redundant or unimplementable logic. This draft
 * satisfies all code and quality requirements.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. Function Structure & Naming
 *   - O 3.3. API SDK Function Usage & Typia Assert
 *   - O 3.4. Data Generation Rules
 *   - O 3.5. Error Scenario & Type Error Prohibition
 *   - O 3.6. Code Quality & Documentation
 *   - O 3.7. Proactive TypeScript Syntax Analysis
 * - Check List
 *
 *   - O No additional import statements
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator function calls have title as first parameter
 *   - O No compilation errors
 *   - O No type error tests (no 'as any')
 *   - O All business/data logic follows DTO/API definitions only
 *   - O All API responses validated with typia.assert()
 */
const __revise = {};
__revise;
