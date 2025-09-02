import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

export async function test_api_admin_product_tag_create_unauthorized_access_error(
  connection: api.IConnection,
) {
  /**
   * Test that creating a product tag without admin authentication is rejected.
   *
   * This test ensures the backend enforces strict role-based access control for
   * product tag creation in the shopping mall AI backend admin panel. Only
   * authenticated admin users should be able to create product tags via POST
   * /shoppingMallAiBackend/admin/productTags. This test attempts to create a
   * tag without authentication, validating that unauthorized attempts are
   * rejected (HTTP 401/403 or domain-specific error).
   *
   * Steps:
   *
   * 1. Ensure an admin user exists by calling admin join (but do not use the
   *    token).
   * 2. Prepare a connection with empty headers (no Authorization token).
   * 3. Create a valid random tag payload (tag_name and tag_code).
   * 4. Attempt to create the product tag using the unauthenticated connection and
   *    expect an authorization failure.
   */

  // 1. Register an admin in case system expects at least one (not used for authentication in this test)
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // 2. Ensure an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Prepare tag creation payload
  const tagPayload = {
    tag_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    tag_code: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallAiBackendProductTag.ICreate;

  // 4. Attempt tag creation without admin auth and expect error
  await TestValidator.error(
    "unauthenticated product tag creation must be denied",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.create(
        unauthConn,
        {
          body: tagPayload,
        },
      );
    },
  );
}
