import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import type { IAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTagModeration";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate admin retrieval of detailed tag moderation records.
 *
 * This test ensures that an admin can retrieve the full details of a tag
 * moderation action. Business flow:
 *
 * 1. Register a new admin user.
 * 2. As the admin, create a new tag (providing unique name and valid status).
 * 3. Perform a moderation action (e.g., approve) on the tag, supplying an
 *    action and reason.
 * 4. Retrieve the specific moderation record using its moderationId and tagId.
 * 5. Assert that all moderation details (action, moderator id, timestamps,
 *    reason) match those originally submitted.
 *
 * This validates correct linkage between tag, moderation action, and admin,
 * and confirms full field fidelity in the returned moderation record.
 */
export async function test_api_tag_moderation_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create a tag as admin
  const tagName: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const tagCreateInput = {
    name: tagName,
    status: "under_review",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IAiCommerceTag.ICreate;
  const createdTag = await api.functional.aiCommerce.admin.tags.create(
    connection,
    {
      body: tagCreateInput,
    },
  );
  typia.assert(createdTag);

  // 3. Admin performs a moderation action (approve)
  const moderationInput = {
    moderation_action: "approve",
    moderation_reason: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IAiCommerceTagModeration.ICreate;
  const createdModeration =
    await api.functional.aiCommerce.admin.tags.moderation.create(connection, {
      tagId: typia.assert<string & tags.Format<"uuid">>(createdTag.id),
      body: moderationInput,
    });
  typia.assert(createdModeration);

  // 4. Retrieve moderation detail by tagId and moderationId
  const moderationDetail =
    await api.functional.aiCommerce.admin.tags.moderation.at(connection, {
      tagId: createdModeration.ai_commerce_tag_id,
      moderationId: createdModeration.id,
    });
  typia.assert(moderationDetail);

  // 5. Validate all moderation detail fields
  TestValidator.equals(
    "moderation id matches",
    moderationDetail.id,
    createdModeration.id,
  );
  TestValidator.equals(
    "moderation tag linkage",
    moderationDetail.ai_commerce_tag_id,
    createdTag.id,
  );
  TestValidator.equals(
    "moderation action matches",
    moderationDetail.moderation_action,
    moderationInput.moderation_action,
  );
  TestValidator.equals(
    "moderator id matches",
    moderationDetail.moderated_by,
    adminAuth.id,
  );
  TestValidator.equals(
    "moderation reason matches",
    moderationDetail.moderation_reason,
    moderationInput.moderation_reason,
  );
  TestValidator.predicate(
    "moderation created_at is ISO string",
    typeof moderationDetail.created_at === "string" &&
      moderationDetail.created_at.length > 0,
  );
}

/**
 * - Confirmed only template-imported modules are used, no additional imports
 *   modified/added.
 * - Each step in the business flow is implemented as described in both DTO and
 *   API function documentation.
 * - Correct random generation for email, password, and tag data with constraints
 *   (sentence/word lengths).
 * - Used 'active' status for admin registration, and 'under_review' for tag;
 *   values comply with descriptions.
 * - All request bodies use satisfies/NO type annotation pattern, with all
 *   required fields present.
 * - API function calls always use await, and typia.assert executed for all API
 *   responses.
 * - No type error testing, no 'as any', no deliberate omission of required props,
 *   or wrong type usage.
 * - TestValidator assertion titles are clear and business-relevant for every
 *   validation step.
 * - Created variables with meaningful names, not mutated, and used new const for
 *   new request / response.
 * - Null/undefined handling reviewed—no issues since all ID values are guaranteed
 *   set and strings never optional.
 * - No test attempts to validate HTTP status codes explicitly.
 * - No hallucinated fields: only schema-available props are used on all DTOs
 *   (confirmed with definitions).
 * - All business logic and data dependencies are respected and validated
 *   (admin–moderation–tag linkages checked).
 *
 * No issues found. The implementation is clean and follows all rules and best
 * practices.
 *
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
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
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
 *   - O NO missing required fields
 *   - O All TestValidator functions have descriptive title as first parameter
 *   - O No compilation errors
 *   - O Proper async/await usage with error testing
 *   - O All DTO variants are used correctly
 *   - O Only actual authentication APIs are used
 *   - O No use of as any for type bypassing
 *   - O Correct handling of null vs undefined
 *   - O No non-existent properties used
 *   - O No import modification
 */
const __revise = {};
__revise;
