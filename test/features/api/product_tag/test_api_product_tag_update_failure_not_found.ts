import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

export async function test_api_product_tag_update_failure_not_found(
  connection: api.IConnection,
) {
  /**
   * Validates that updating a product tag with a non-existent tagId as an admin
   * returns a 404 not-found error.
   *
   * This test covers negative admin workflows for catalog integrity:
   *
   * 1. Register and authenticate an admin account (sets up authentication context)
   * 2. Attempt to update a product tag using a randomly-generated UUID that does
   *    not match any existing tag
   *
   *    - The request uses a realistic payload for tag_name and tag_code
   *    - The operation must fail with HTTP 404 (not found)
   * 3. Assert that the backend enforces strict resource presence validation and
   *    proper error handling for invalid resource targets
   */

  // 1. Register and authenticate as admin
  const adminCreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@company.com`,
    is_active: true,
    ...(Math.random() > 0.5 ? { phone_number: RandomGenerator.mobile() } : {}),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuth);

  // 2. Attempt update with a non-existent tagId
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  const tagUpdateBody = {
    tag_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    tag_code: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallAiBackendProductTag.IUpdate;

  await TestValidator.httpError(
    "should throw not found error when updating non-existent product tag",
    404,
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.update(
        connection,
        {
          tagId: nonExistentTagId,
          body: tagUpdateBody,
        },
      );
    },
  );
}
