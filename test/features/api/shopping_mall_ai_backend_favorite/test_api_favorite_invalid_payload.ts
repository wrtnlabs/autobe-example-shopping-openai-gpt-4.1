import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_invalid_payload(
  connection: api.IConnection,
) {
  /**
   * Validates input payload error handling for
   * /shoppingMallAiBackend/customer/favorites (favorite create) endpoint.
   *
   * Steps:
   *
   * 1. Register a customer for authentication context
   * 2. Try to create favorite with missing 'target_type' (should fail validation)
   * 3. Try with illegal type for 'target_type' (number), exploiting runtime error
   *    path
   * 4. (Optionally) Try passing empty string for target_type if business treats as
   *    invalid (use case-by-case) Each invalid attempt must fail with a
   *    validation error, confirming input requirements are enforced.
   */

  // 1. Register new customer (auth context)
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResult);
  const customerId = joinResult.customer.id;

  // 2. Attempt to create favorite with missing 'target_type'
  await TestValidator.error(
    "favorite creation: missing target_type field should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: customerId,
            // target_type intentionally omitted
          } as unknown as IShoppingMallAiBackendFavorite.ICreate,
        },
      );
    },
  );

  // 3. Attempt to create favorite with numeric 'target_type' (should fail validation if backend checks type)
  await TestValidator.error(
    "favorite creation: numeric target_type value should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: customerId,
            target_type: 12345 as unknown as string, // force a number instead of string
          } as unknown as IShoppingMallAiBackendFavorite.ICreate,
        },
      );
    },
  );

  // 4. Attempt to create favorite with empty string for target_type (if business forbids empty strings)
  await TestValidator.error(
    "favorite creation: empty target_type string should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: customerId,
            target_type: "",
          } satisfies IShoppingMallAiBackendFavorite.ICreate,
        },
      );
    },
  );
}
