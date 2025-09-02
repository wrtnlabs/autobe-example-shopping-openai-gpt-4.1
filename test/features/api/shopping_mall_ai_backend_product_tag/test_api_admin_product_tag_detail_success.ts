import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

/**
 * Test successfully retrieving a product tag's details as an authenticated
 * admin.
 *
 * This end-to-end test validates the workflow for admin product tag detail
 * lookup. It ensures:
 *
 * - Admin authentication and account registration works
 * - Product tag creation operates with unique name and code
 * - Tag detail retrieval returns all fields correctly and matches what was
 *   just created
 * - System audit/evidence fields are present and correctly linked to the
 *   created record
 *
 * Steps covered:
 *
 * 1. Register a new admin user (required for admin endpoints)
 * 2. Create a new product tag as that admin
 * 3. Retrieve details of the created product tag by its unique id
 * 4. Validate all response fields (data integrity, evidence, and business
 *    logic)
 */
export async function test_api_admin_product_tag_detail_success(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // Simulate proper hash length
  const adminEmail: string = `${RandomGenerator.alphaNumeric(6)}@test.com`;
  const adminName: string = RandomGenerator.name();
  const adminPhone: string = RandomGenerator.mobile();

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
  TestValidator.equals("joined admin name", adminJoin.admin.name, adminName);
  TestValidator.equals(
    "joined admin username",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals("joined admin email", adminJoin.admin.email, adminEmail);

  // 2. Create a new product tag as the admin
  const tagName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const tagCode: string = RandomGenerator.alphaNumeric(12);

  const createdTag =
    await api.functional.shoppingMallAiBackend.admin.productTags.create(
      connection,
      {
        body: {
          tag_name: tagName,
          tag_code: tagCode,
        } satisfies IShoppingMallAiBackendProductTag.ICreate,
      },
    );
  typia.assert(createdTag);
  TestValidator.equals("created tag name", createdTag.tag_name, tagName);
  TestValidator.equals("created tag code", createdTag.tag_code, tagCode);
  TestValidator.predicate(
    "created tag id is a nonempty string",
    typeof createdTag.id === "string" && createdTag.id.length > 0,
  );

  // 3. Retrieve the tag's details using admin detail endpoint
  const reloadedTag =
    await api.functional.shoppingMallAiBackend.admin.productTags.at(
      connection,
      {
        tagId: createdTag.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(reloadedTag);

  // 4. Validate field equality between created and retrieved tag
  TestValidator.equals(
    "reloaded tag id matches created",
    reloadedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "reloaded tag name matches",
    reloadedTag.tag_name,
    tagName,
  );
  TestValidator.equals(
    "reloaded tag code matches",
    reloadedTag.tag_code,
    tagCode,
  );
  TestValidator.equals(
    "created_at matches",
    reloadedTag.created_at,
    createdTag.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    reloadedTag.updated_at,
    createdTag.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null or undefined (not deleted)",
    reloadedTag.deleted_at ?? null,
    null,
  );
}
