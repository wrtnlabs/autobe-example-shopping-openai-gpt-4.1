import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

/**
 * Test successful creation of a new product tag by an authenticated admin.
 *
 * 1. Register a new admin with unique, valid credentials (username, name,
 *    unique email, phone, "hashed" password).
 * 2. The account is authenticated immediately after registration—token is set
 *    on connection by join.
 * 3. Use the authenticated connection to create a product tag, providing
 *    unique tag_name and tag_code.
 * 4. Validate the product tag creation response:
 *
 *    - Id, tag_name, tag_code, created_at, updated_at present and correct
 *    - Tag_name and tag_code reflect original input
 *    - Created_at and updated_at fields are non-empty ISO strings (backend
 *         responsibility)
 *    - Audit field deleted_at is null or undefined for a new tag
 */
export async function test_api_admin_product_tag_create_success(
  connection: api.IConnection,
) {
  // Step 1: Register & authenticate admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const passwordHash = RandomGenerator.alphaNumeric(32); // Simulated hash for API contract
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@autobetest.com`;
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();

  const joinRes = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(joinRes);

  // Step 2: Prepare product tag input and create
  const productTagName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const productTagCode = RandomGenerator.alphaNumeric(12);

  const tagRes =
    await api.functional.shoppingMallAiBackend.admin.productTags.create(
      connection,
      {
        body: {
          tag_name: productTagName,
          tag_code: productTagCode,
        } satisfies IShoppingMallAiBackendProductTag.ICreate,
      },
    );
  typia.assert(tagRes);

  // Step 3: Validate product tag object and audit fields
  TestValidator.predicate(
    "product tag response has non-empty id string",
    typeof tagRes.id === "string" && tagRes.id.length > 0,
  );
  TestValidator.equals(
    "product tag name matches input",
    tagRes.tag_name,
    productTagName,
  );
  TestValidator.equals(
    "product tag code matches input",
    tagRes.tag_code,
    productTagCode,
  );
  TestValidator.predicate(
    "product tag 'created_at' is non-empty ISO string",
    typeof tagRes.created_at === "string" && tagRes.created_at.length > 0,
  );
  TestValidator.predicate(
    "product tag 'updated_at' is non-empty ISO string",
    typeof tagRes.updated_at === "string" && tagRes.updated_at.length > 0,
  );
  // deleted_at is optional/null for a newly created tag
  TestValidator.equals(
    "product tag 'deleted_at' is null or undefined on creation",
    tagRes.deleted_at,
    null,
  );
}
