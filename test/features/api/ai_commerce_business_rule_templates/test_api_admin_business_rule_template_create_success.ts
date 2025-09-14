import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBusinessRuleTemplates } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplates";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test creating a new business rule template as an authenticated admin.
 *
 * This scenario ensures admin-authenticated context by first performing an
 * admin join (internal registration). Then it creates a new business rule
 * template using POST /aiCommerce/admin/businessRuleTemplates with all
 * required fields provided, including code, name, version, template_data,
 * business_status, created_at, updated_at, (optional: deleted_at).
 * Validates that the API returns a properly shaped
 * IAiCommerceBusinessRuleTemplates object. All fields, especially code,
 * version, and creation/update timestamps, are random but valid.
 *
 * 1. Join as admin (secure random email, strong password, status='active')
 * 2. Create a business rule template (unique random code/version,
 *    names/descriptions, config data, active status, ISO date-times)
 * 3. Validate the output (type-check with typia.assert, business value checks)
 */
export async function test_api_admin_business_rule_template_create_success(
  connection: api.IConnection,
) {
  // 1. Join as admin to authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a new business rule template
  const now = new Date();
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    version: typia.random<number & tags.Type<"int32">>(),
    template_data: JSON.stringify({ sample: "rule-data", enabled: true }),
    business_status: "active",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
  } satisfies IAiCommerceBusinessRuleTemplates.ICreate;
  const template =
    await api.functional.aiCommerce.admin.businessRuleTemplates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(template);

  // 3. Validate that response matches what was sent
  TestValidator.equals(
    "created template code matches input",
    template.code,
    createBody.code,
  );
  TestValidator.equals(
    "created template version matches input",
    template.version,
    createBody.version,
  );
  TestValidator.equals(
    "created template status matches input",
    template.business_status,
    createBody.business_status,
  );
  TestValidator.equals(
    "deleted_at is null for fresh template",
    template.deleted_at,
    null,
  );
}

/**
 * - Verified that only declared DTOs & API functions are used.
 * - All required fields for both admin join and template creation are present and
 *   follow types: code, name, version, template_data, business_status,
 *   created_at, updated_at filled as required.
 * - No type error, no invented property, no extra import statements.
 * - Every API call uses await.
 * - All random data uses proper constraints (e.g., alphaNumeric, ISO dates, int32
 *   version).
 * - TestValidator assertions all use titles as first parameter.
 * - All TestValidator checks maintain actual-first, expected-second order.
 * - Typia.assert is used on both admin and template responses for exhaustive
 *   shape validation.
 * - Deleted_at is tested for null.
 * - No code attempts to use undefined or missing properties.
 * - No logic error in authentication setup: admin authentication precedes
 *   template creation.
 * - No listing/search API is supplied; thus, the test only validates using
 *   immediate returns (in reality, a list call would also be checked if
 *   available).
 * - No code tests type errors or missing required fields.
 * - Function name, structure, and parameter match requirements precisely.
 * - Imports, code placement, and business context all align with expectations.
 * - No extraneous or illogical code is present.
 * - No creative or unnecessary checks are performed; test focuses strictly on the
 *   defined workflow.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Function only uses provided types and APIs
 *   - O CRITICAL: All TestValidator functions use title as first parameter
 *   - O No response type validation after typia.assert()
 *   - O No creative or required property omission
 *   - O Null/undefinable values handled correctly
 *   - O Request body randomization uses typia.random or RandomGenerator
 *   - O All API calls are awaited
 *   - O CRITICAL: No type error tests present
 *   - O No extra properties invented in requests or assertions
 *   - O No missing required fields
 *   - O Template untouched except within allowed code region
 */
const __revise = {};
__revise;
