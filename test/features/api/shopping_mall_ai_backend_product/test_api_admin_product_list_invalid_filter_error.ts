import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_list_invalid_filter_error(
  connection: api.IConnection,
) {
  /**
   * E2E test: Attempt to use a malformed or invalid filter with admin product
   * index.
   *
   * 1. Register and authenticate a new admin using valid random credentials
   *    (unique username, email).
   * 2. Attempt to query /shoppingMallAiBackend/admin/products using invalid filter
   *    criteria that are syntactically valid per DTO but semantically or
   *    logically not allowed (e.g., unsupported/unknown 'business_status',
   *    negative page/limit, gibberish codes).
   * 3. Expect an error, and validate that no sensitive admin/token data is leaked.
   *
   * This test guarantees server-side validation and secure error responses.
   */
  // 1. Register admin account (join and authenticate)
  const randomUsername = RandomGenerator.alphaNumeric(12);
  const randomEmail = `${RandomGenerator.alphaNumeric(10)}@example.biz`;
  const password = RandomGenerator.alphaNumeric(16);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: randomUsername,
      password_hash: password,
      name: RandomGenerator.name(),
      email: randomEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Attempt invalid filter (type-valid but business-invalid)
  await TestValidator.error(
    "admin product list with invalid filter should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.index(
        connection,
        {
          body: {
            page: -5, // invalid: negative page number
            limit: 0, // invalid: zero-limit not allowed
            product_type: "!@#$%INVALID", // unknown
            business_status: "NON_EXISTENT_STATUS", // fake status
          } satisfies IShoppingMallAiBackendProduct.IRequest,
        },
      );
    },
  );
}
