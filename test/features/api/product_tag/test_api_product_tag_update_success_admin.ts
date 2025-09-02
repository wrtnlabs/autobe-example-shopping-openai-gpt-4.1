import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

export async function test_api_product_tag_update_success_admin(
  connection: api.IConnection,
) {
  /**
   * Test successful update of a product tag's information by an admin.
   *
   * Steps:
   *
   * 1. Register and authenticate a new admin via /auth/admin/join (token is set
   *    automatically).
   * 2. Simulate existence of a product tag by generating a UUID (since creation
   *    API is not available).
   * 3. Prepare new values for tag_name and tag_code fields.
   * 4. Update the tag as the admin and validate the response contains updated
   *    data.
   * 5. Assert that updated_at >= created_at and that tag fields are properly
   *    updated.
   */

  // 1. Register and authenticate a new admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulates pre-hashed password
  const adminName = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@business.com`;
  const adminPhone = RandomGenerator.mobile();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "joined admin username matches",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "joined admin email matches",
    adminJoin.admin.email,
    adminEmail,
  );
  TestValidator.predicate("admin account is active", adminJoin.admin.is_active);

  // 2. Simulate an existing tag by generating its UUID
  const tagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Compose update body
  const updateInput: IShoppingMallAiBackendProductTag.IUpdate = {
    tag_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 12,
    }),
    tag_code: RandomGenerator.alphaNumeric(16),
  };

  // 4. Update the product tag as admin
  const updatedTag =
    await api.functional.shoppingMallAiBackend.admin.productTags.update(
      connection,
      {
        tagId,
        body: updateInput,
      },
    );
  typia.assert(updatedTag);

  // 5. Assert tag fields are updated
  TestValidator.equals(
    "product tag ID remains unchanged",
    updatedTag.id,
    tagId,
  );
  if (typeof updateInput.tag_name === "string") {
    TestValidator.equals(
      "tag name updated",
      updatedTag.tag_name,
      updateInput.tag_name,
    );
  }
  if (typeof updateInput.tag_code === "string") {
    TestValidator.equals(
      "tag code updated",
      updatedTag.tag_code,
      updateInput.tag_code,
    );
  }
  TestValidator.predicate(
    "updated_at timestamp reflects update",
    new Date(updatedTag.updated_at).getTime() >=
      new Date(updatedTag.created_at).getTime(),
  );
}
