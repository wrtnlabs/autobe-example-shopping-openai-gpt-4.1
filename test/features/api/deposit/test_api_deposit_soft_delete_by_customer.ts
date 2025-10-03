import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";

/**
 * Validate soft-deletion (logical removal) of a deposit account by the customer
 * (owner).
 *
 * 1. Register a new customer, obtaining both identity and token
 * 2. Create a deposit account for the customer linked to their account
 * 3. Perform soft-delete on the deposit (DELETE endpoint with depositId)
 * 4. Assert that deleted_at is set afterwards by simulating re-creation or logic,
 *    as the API doesn't provide direct read/search
 * 5. Validate that deletion is idempotent and safe against repeated/non-existent
 *    target
 * 6. Check for proper error behavior on second delete attempt and for a fake
 *    depositId
 */
export async function test_api_deposit_soft_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer and obtain identity/token
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);

  // 2. Create deposit account for customer
  const depositBody = {
    shopping_mall_customer_id: customer.id,
    balance: 10000,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: depositBody,
    });
  typia.assert(deposit);

  // 3. Soft-delete (logical remove) the deposit
  await api.functional.shoppingMall.customer.deposits.erase(connection, {
    depositId: deposit.id,
  });
  // No result body (void); assume deposit is now logically deleted

  // 4. Can't directly read, so simulate behavior: try deleting again, should error
  await TestValidator.error("repeated soft-delete should fail", async () => {
    await api.functional.shoppingMall.customer.deposits.erase(connection, {
      depositId: deposit.id,
    });
  });
  // 5. Deleting a non-existent deposit (random UUID) should also error
  await TestValidator.error(
    "delete non-existent deposit should fail",
    async () => {
      await api.functional.shoppingMall.customer.deposits.erase(connection, {
        depositId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
