import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_delete_no_permission(
  connection: api.IConnection,
) {
  /**
   * Validate that non-admin (customer) users cannot perform hard deletion of
   * coin wallets via the admin-only endpoint.
   *
   * 1. Register and authenticate an admin account.
   * 2. Register and authenticate a customer account (to use as unauthorized
   *    context).
   * 3. Re-authenticate as admin and create a coin wallet owned by the customer.
   * 4. Switch to customer context (authenticate as customer).
   * 5. Attempt to hard delete (erase) the coin wallet as the customer.
   * 6. Assert that the operation fails with the expected permission enforcement
   *    error.
   */

  // 1. Register and authenticate an admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // Simulate hash value
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: adminName,
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);
  const adminId = admin.admin.id;

  // 2. Register and authenticate a customer account
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const customerPhone: string = RandomGenerator.mobile();
  const customerName: string = RandomGenerator.name();
  const customerNickname: string = RandomGenerator.name(1);
  const customer: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        phone_number: customerPhone,
        password: customerPassword,
        name: customerName,
        nickname: customerNickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer);
  const customerId = customer.customer.id;

  // 3. Switch back to admin token and create coin wallet for customer
  await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  const coin: IShoppingMallAiBackendCoin =
    await api.functional.shoppingMallAiBackend.admin.coins.create(connection, {
      body: {
        shopping_mall_ai_backend_customer_id: customerId,
        total_accrued: 10000,
        usable_coin: 8000,
        expired_coin: 1000,
        on_hold_coin: 1000,
      } satisfies IShoppingMallAiBackendCoin.ICreate,
    });
  typia.assert(coin);

  // 4. Switch context to customer by re-authenticating
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 5. Unauthorized customer attempts hard deletion of coin wallet
  await TestValidator.error(
    "coin wallet deletion should be denied for non-admin",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.erase(connection, {
        coinId: coin.id,
      });
    },
  );
}
