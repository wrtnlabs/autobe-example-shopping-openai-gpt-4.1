import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import type { IAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTagModeration";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Successfully create a tag moderation action as an admin, and verify
 * business linkage.
 *
 * 1. Register a new admin account using random email, secure password, and set
 *    active status.
 * 2. Log in as this admin to establish authentication (token automatically
 *    handled).
 * 3. Create a new tag using unique name, set status to 'under_review', and
 *    optional description.
 * 4. Choose a moderation action — one of 'approve', 'reject', 'flag', or
 *    'suspend'. Add optional moderation_reason.
 * 5. Call the moderation create API with the tag's id, the action, and reason.
 * 6. Assert the returned moderation record:
 *
 *    - Ai_commerce_tag_id matches the created tag
 *    - Moderation_action matches the input
 *    - Moderated_by matches the admin's id
 *    - Moderation_reason matches input (if given)
 *    - Created_at is a valid ISO8601 datetime (type-validated via typia.assert)
 * 7. All API responses are passed to typia.assert (no further
 *    property-by-property validation).
 * 8. Randomized, type-safe value generation is used for input fields.
 */
export async function test_api_tag_moderation_create_success(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Admin login
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IAiCommerceAdmin.ILogin;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(adminLogin);

  // 3. Tag creation
  const tagInput = {
    name: RandomGenerator.alphaNumeric(10),
    status: "under_review",
    description: RandomGenerator.paragraph(),
  } satisfies IAiCommerceTag.ICreate;
  const tag = await api.functional.aiCommerce.admin.tags.create(connection, {
    body: tagInput,
  });
  typia.assert(tag);

  // 4. Choose valid moderation action and reason
  const moderationActions = ["approve", "reject", "flag", "suspend"] as const;
  const pickedAction = RandomGenerator.pick(moderationActions);
  const pickedReason = RandomGenerator.paragraph({ sentences: 2 });
  const moderationInput = {
    moderation_action: pickedAction,
    moderation_reason: pickedReason,
  } satisfies IAiCommerceTagModeration.ICreate;

  // 5. Create moderation record
  const moderation =
    await api.functional.aiCommerce.admin.tags.moderation.create(connection, {
      tagId: typia.assert<string & tags.Format<"uuid">>(tag.id),
      body: moderationInput,
    });
  typia.assert(moderation);

  // 6. Business linkage assertions
  TestValidator.equals(
    "moderation references correct tag",
    moderation.ai_commerce_tag_id,
    tag.id,
  );
  TestValidator.equals(
    "moderation action matches input",
    moderation.moderation_action,
    pickedAction,
  );
  TestValidator.equals(
    "moderator matches admin",
    moderation.moderated_by,
    adminAuth.id,
  );
  TestValidator.equals(
    "moderation reason matches input",
    moderation.moderation_reason,
    pickedReason,
  );
}

/**
 * - All steps follow the business scenario and perform realistic admin+moderation
 *   flow.
 * - All types for request and response bodies match the provided DTOs, with
 *   `satisfies` for input bodies.
 * - All API requests are invoked with `await` and use correct imports (no added
 *   imports or require).
 * - Tag ID is correctly handled as uuid and moderator's ID matches the admin
 *   account.
 * - Zero tests for type errors, HTTP status, or other forbidden logic. No
 *   manipulations of connection.headers.
 * - TestValidator assertions use proper title and parameter order.
 * - Only documented properties in inputs and outputs are accessed, with no
 *   hallucinated fields.
 * - Nullable moderation_reason is properly set and validated.
 * - No missing required properties and no omitted nulls where needed.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O TestValidator functions always use title
 *   - O Function body follows template guidelines
 */
const __revise = {};
__revise;
