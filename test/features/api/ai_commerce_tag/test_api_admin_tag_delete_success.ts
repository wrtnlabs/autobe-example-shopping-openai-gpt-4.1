import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates that an admin can create and then permanently delete an aiCommerce
 * tag by tagId.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin.
 * 2. Create a tag via the admin interface.
 * 3. Delete the created tag by its id (hard delete).
 * 4. Attempt to delete the same tag again, expecting a business error.
 */
export async function test_api_admin_tag_delete_success(
  connection: api.IConnection,
) {
  // 1. Register/admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinRes: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(adminJoinRes);

  // 2. Create a tag
  const tagName = RandomGenerator.name();
  const tag: IAiCommerceTag = await api.functional.aiCommerce.admin.tags.create(
    connection,
    {
      body: {
        name: tagName,
        status: "active",
        description: RandomGenerator.paragraph(),
      } satisfies IAiCommerceTag.ICreate,
    },
  );
  typia.assert(tag);
  TestValidator.equals("tag name matches", tag.name, tagName);

  // 3. Delete the tag (hard delete)
  await api.functional.aiCommerce.admin.tags.erase(connection, {
    tagId: tag.id as string & tags.Format<"uuid">,
  });

  // 4. Attempt to delete again, expect error
  await TestValidator.error("delete already deleted tag fails", async () => {
    await api.functional.aiCommerce.admin.tags.erase(connection, {
      tagId: tag.id as string & tags.Format<"uuid">,
    });
  });
}

/**
 * - Imports: Only template-defined imports are used, no extra imports added.
 * - All API calls use await as required.
 * - No TypeScript type errors or lint/compilation issues detected in the code.
 * - Proper DTO types are used (IAiCommerceAdmin.IJoin, IAiCommerceTag.ICreate,
 *   IAiCommerceTag) for each operation.
 * - TestValidator.error is properly used with async callback and await.
 * - There are no business logic issues or illogical workflow (register admin >
 *   create tag > delete tag > try deleting again).
 * - Use of typia.assert and TestValidator.equals is correct.
 * - All generated random values (email, name, description) respect field type
 *   constraints.
 * - No unimplementable scenario parts and no use of type error cases.
 * - Code is clean, readable, and function body contains only the described steps
 *   without extraneous code.
 * - No use of non-existent or hallucinated API endpoints or DTO fields. Final
 *   code is production-ready and meets all checklist and rules.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O Test logic matches scenario
 *   - O TestValidator.error used with await for async fn
 *   - O No DTO type confusion
 */
const __revise = {};
__revise;
