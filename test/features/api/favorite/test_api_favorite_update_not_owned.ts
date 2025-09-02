import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_update_not_owned(
  connection: api.IConnection,
) {
  /**
   * Validate that a customer cannot update another customer's favorite entry.
   *
   * Steps:
   *
   * 1. Register Customer1 and authenticate (token in connection).
   * 2. Register Customer2 (token in connection, will switch to this later).
   * 3. As Customer1, simulate existence of a favoriteId (since create is
   *    unavailable, mock for non-owner test).
   * 4. Switch to Customer2 authentication context (by re-joining with Customer2's
   *    credentials).
   * 5. Attempt to update Customer1's favoriteId as Customer2.
   * 6. Validate that forbidden (ownership) error is thrown and the update does not
   *    proceed.
   */

  // 1. Register Customer1 and retain info for favorite ownership
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Password = typia.random<string & tags.Format<"password">>();
  const customer1Name = RandomGenerator.name(2);
  const customer1Nickname = RandomGenerator.name(1);
  const customer1Phone = RandomGenerator.mobile();
  const customer1: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer1Email,
        phone_number: customer1Phone,
        password: customer1Password,
        name: customer1Name,
        nickname: customer1Nickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer1);
  const favoriteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register Customer2
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Password = typia.random<string & tags.Format<"password">>();
  const customer2Name = RandomGenerator.name(2);
  const customer2Nickname = RandomGenerator.name(1);
  const customer2Phone = RandomGenerator.mobile();
  const customer2: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer2Email,
        phone_number: customer2Phone,
        password: customer2Password,
        name: customer2Name,
        nickname: customer2Nickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer2);

  // 3. Switch to Customer2 authentication context
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      phone_number: customer2Phone,
      password: customer2Password,
      name: customer2Name,
      nickname: customer2Nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 4. Attempt forbidden update (should not be permitted for customer2 on customer1's favorite)
  await TestValidator.error(
    "Customer2 cannot update another customer's favorite entry",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.update(
        connection,
        {
          favoriteId,
          body: {
            title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallAiBackendFavorite.IUpdate,
        },
      );
    },
  );
}
