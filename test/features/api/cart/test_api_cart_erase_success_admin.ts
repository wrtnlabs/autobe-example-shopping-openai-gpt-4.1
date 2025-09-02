import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_cart_erase_success_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test for an admin performing soft deletion (logical removal) of a
   * customer cart.
   *
   * Scenario:
   *
   * 1. Register a new admin account (context becomes admin)
   * 2. Register a new customer account and login (context becomes customer)
   * 3. Customer creates a shopping cart
   * 4. Switch back to admin context and login
   * 5. Admin performs soft delete (erase) on the customer's cart
   *
   * Notes:
   *
   * - All role switching and authentication flows are explicit.
   * - Post-deletion validation of deleted_at is omitted due to lack of cart query
   *   API in provided materials.
   * - All DTO and API usage is precise according to given definitions.
   */

  // 1. Register admin
  const adminUsername = RandomGenerator.name(1);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test`;
  const adminName = RandomGenerator.name();
  const adminJoinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinOutput);

  // 2. Register customer
  const customerEmail =
    `${RandomGenerator.alphabets(8)}@customer.test` as string &
      tags.Format<"email">;
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const customerPhone = RandomGenerator.mobile();
  const customerName = RandomGenerator.name();
  const customerJoinOutput = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        phone_number: customerPhone,
        name: customerName,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerJoinOutput);

  // 3. Customer creates a cart (customer context)
  const cartToken = RandomGenerator.alphaNumeric(20);
  const cartStatus = "active";
  const cartCreateOutput =
    await api.functional.shoppingMallAiBackend.customer.carts.create(
      connection,
      {
        body: {
          cart_token: cartToken,
          status: cartStatus,
        } satisfies IShoppingMallAiBackendCart.ICreate,
      },
    );
  typia.assert(cartCreateOutput);

  // 4. Switch context back to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 5. Admin erases customer cart
  await api.functional.shoppingMallAiBackend.admin.carts.erase(connection, {
    cartId: cartCreateOutput.id,
  });
  // No post-delete state validation is possible per material limitations
}
