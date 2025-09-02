import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

export async function test_api_admin_product_tag_create_duplicate_code_error(
  connection: api.IConnection,
) {
  /**
   * Test enforcement of global uniqueness for product tag codes.
   *
   * 1. Register a new admin account (required for authentication).
   * 2. Create a unique product tag with a distinct tag_code.
   * 3. Attempt to create a second product tag with the exact same tag_code but a
   *    different tag_name.
   * 4. Confirm a business logic error is thrown (uniqueness violation on
   *    tag_code).
   */

  // Step 1: Register and authenticate admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(12)}@example.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Backend expects a hash, simulate with a random string
  const adminName = RandomGenerator.name();
  const adminJoinInput = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: adminName,
    email: adminEmail,
    is_active: true,
    phone_number: null,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const joinResp = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(joinResp);
  TestValidator.equals(
    "admin username matches input",
    joinResp.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches input",
    joinResp.admin.email,
    adminEmail,
  );

  // Step 2: Create a product tag with a unique tag_code
  const tagCode = RandomGenerator.alphaNumeric(14).toLowerCase();
  const tagName1 = RandomGenerator.name(2);
  const tagCreate1 = {
    tag_name: tagName1,
    tag_code: tagCode,
  } satisfies IShoppingMallAiBackendProductTag.ICreate;
  const productTag1 =
    await api.functional.shoppingMallAiBackend.admin.productTags.create(
      connection,
      { body: tagCreate1 },
    );
  typia.assert(productTag1);
  TestValidator.equals(
    "created tag_code matches input",
    productTag1.tag_code,
    tagCode,
  );
  TestValidator.equals(
    "created tag_name matches input",
    productTag1.tag_name,
    tagName1,
  );
  TestValidator.predicate(
    "tag id is present",
    typeof productTag1.id === "string" && productTag1.id.length > 0,
  );

  // Step 3: Attempt to create another product tag with the same tag_code
  const tagName2 = RandomGenerator.name(3);
  const tagCreate2 = {
    tag_name: tagName2,
    tag_code: tagCode, // intentional duplicate!
  } satisfies IShoppingMallAiBackendProductTag.ICreate;

  // Step 4: Expect an error due to duplicate code
  await TestValidator.error(
    "should block duplicate tag_code on product tag creation",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.create(
        connection,
        { body: tagCreate2 },
      );
    },
  );
}
