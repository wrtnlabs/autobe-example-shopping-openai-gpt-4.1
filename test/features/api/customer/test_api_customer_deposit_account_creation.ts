import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";

/**
 * Validates deposit account creation for a new customer and enforces uniqueness
 * and ownership business logic.
 *
 * - Registers a fresh customer in a unique channel using a valid random email,
 *   password, name, and optional phone.
 * - Immediately after registration, attempts deposit account creation for that
 *   customer.
 * - Ensures only one active deposit per customer is allowed: second creation for
 *   the same user should fail.
 * - Attempts deposit creation for another user's id using a different customer
 *   session and expects rejection.
 * - Verifies fields (id, balance, status, created_at/updated_at, deleted_at,
 *   shopping_mall_customer_id) and audit logic.
 * - Asserts only the owning customer is allowed to create the deposit, and
 *   business invariants (uniqueness) are respected.
 */
export async function test_api_customer_deposit_account_creation(
  connection: api.IConnection,
) {
  // 1. Register a new customer in a unique channel
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. First deposit creation (success)
  const depositBody = {
    shopping_mall_customer_id: customer1.id,
    balance: 0,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit1 = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    { body: depositBody },
  );
  typia.assert(deposit1);
  TestValidator.equals(
    "deposit linked to right customer",
    deposit1.shopping_mall_customer_id,
    customer1.id,
  );
  TestValidator.equals("initial balance zero", deposit1.balance, 0);
  TestValidator.equals("status active", deposit1.status, "active");
  TestValidator.predicate(
    "has id (uuid)",
    typeof deposit1.id === "string" && deposit1.id.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof deposit1.created_at === "string" && deposit1.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof deposit1.updated_at === "string" && deposit1.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    deposit1.deleted_at ?? null,
    null,
  );
  // 3. Second deposit attempt for same customer (should fail)
  await TestValidator.error(
    "duplicate deposit creation is forbidden",
    async () => {
      await api.functional.shoppingMall.customer.deposits.create(connection, {
        body: depositBody,
      });
    },
  );
  // 4. Register a different customer (other actor)
  const email2 = typia.random<string & tags.Format<"email">>();
  const channelId2 = typia.random<string & tags.Format<"uuid">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId2,
      email: email2,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 5. Using customer2, attempt to create deposit for customer1's id (should fail: only owner allowed)
  await TestValidator.error(
    "deposit creation only allowed for self",
    async () => {
      await api.functional.shoppingMall.customer.deposits.create(connection, {
        body: {
          shopping_mall_customer_id: customer1.id,
          balance: 0,
          status: "active",
        } satisfies IShoppingMallDeposit.ICreate,
      });
    },
  );
}
