import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

/**
 * Test that updating a product tag with a duplicate tag_code is rejected.
 *
 * This test covers the scenario where an admin attempts to update a product
 * tag, setting its 'tag_code' property to a value that is already in use by
 * another tag. The business rule is that 'tag_code' must be unique,
 * enforced at the API/database layer. If the uniqueness constraint is
 * violated, the API must return a validation error and deny the update.
 *
 * Because there is no explicit product tag creation endpoint, tag setup
 * uses the update endpoint to simulate tag creation by assigning random
 * UUID ids and initial unique tag_code values. Steps:
 *
 * 1. Register a new admin (acquire authorization for further API calls).
 * 2. Create two tags (simulated via update), each with distinct tag_code and
 *    tag_id.
 * 3. Assert the two tag ids are distinct (sanity check).
 * 4. Attempt to update the second tag's tag_code to the first tag's value,
 *    expecting a validation error.
 */
export async function test_api_product_tag_update_failure_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authentication
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@email.com`,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminReg);

  // 2. Simulate creation of two product tags (using update with random UUIDs)
  const firstTagId = typia.random<string & tags.Format<"uuid">>();
  const secondTagId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals("Tag IDs must be distinct", firstTagId, secondTagId);

  const firstTagCode = RandomGenerator.alphaNumeric(6);
  const secondTagCode = RandomGenerator.alphaNumeric(6);
  const firstTagName = RandomGenerator.name(2);
  const secondTagName = RandomGenerator.name(2);

  // Create first tag with unique tag_code
  const firstTag =
    await api.functional.shoppingMallAiBackend.admin.productTags.update(
      connection,
      {
        tagId: firstTagId,
        body: {
          tag_name: firstTagName,
          tag_code: firstTagCode,
        } satisfies IShoppingMallAiBackendProductTag.IUpdate,
      },
    );
  typia.assert(firstTag);
  TestValidator.equals(
    "first tag's code matches input",
    firstTag.tag_code,
    firstTagCode,
  );

  // Create second tag with another unique tag_code
  const secondTag =
    await api.functional.shoppingMallAiBackend.admin.productTags.update(
      connection,
      {
        tagId: secondTagId,
        body: {
          tag_name: secondTagName,
          tag_code: secondTagCode,
        } satisfies IShoppingMallAiBackendProductTag.IUpdate,
      },
    );
  typia.assert(secondTag);
  TestValidator.equals(
    "second tag's code matches input",
    secondTag.tag_code,
    secondTagCode,
  );

  // 4. Attempt to update the second tag's code to the first tag's code: should fail (duplicate code)
  await TestValidator.error(
    "Product tag code duplication should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.update(
        connection,
        {
          tagId: secondTagId,
          body: {
            tag_code: firstTagCode,
          } satisfies IShoppingMallAiBackendProductTag.IUpdate,
        },
      );
    },
  );
}
