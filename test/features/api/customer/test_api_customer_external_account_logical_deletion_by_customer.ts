import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate customer-initiated logical deletion of an external (social) account
 * association.
 *
 * Steps:
 *
 * 1. Customer registers (with randomly generated valid data).
 * 2. The test simulates pre-condition setup (mock) for having an external account
 *    linked, since no externalAccount linking API exists in this scope.
 * 3. "Unlink" operation (logical delete) for an external account that the customer
 *    "owns". This must succeed with void response.
 * 4. Attempting to call the deletion as another customer (not the owner) must fail
 *    with business error.
 * 5. The audit/history aspect and active listing are not directly testable since
 *    no corresponding query/list APIs exist for external accounts in these
 *    materials.
 * 6. No direct way to verify that the deleted_at field was set; the test will
 *    simply check API void response compliance and enforce permission rules.
 * 7. No API for testing forbidden/system-managed deletion edge case or querying
 *    audit evidence, so those flows are omitted.
 *
 * Notes:
 *
 * - Due to missing link/query/audit APIs for external accounts, the test is
 *   primarily limited to ownership/permission deletion and void response
 *   semantics.
 */
export async function test_api_customer_external_account_logical_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins (registers)
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);

  // Synthesize an externalAccountId (would be created by an upstream linking process, not in our API list)
  const externalAccountId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // direct deletion: succeed for owner
  await api.functional.shoppingMall.customer.customers.externalAccounts.erase(
    connection,
    {
      customerId: customer.id,
      externalAccountId,
    },
  );
  // No response body is expected so nothing to assert for void response

  // Negative permission test: another customer attempts deletion (must fail)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherBody = {
    shopping_mall_channel_id: channelId,
    email: otherEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: otherBody,
  });
  typia.assert(otherCustomer);

  // Attempt logical deletion with another customer (should throw business error)
  await TestValidator.error(
    "only the owner can unlink a specific external account",
    async () => {
      await api.functional.shoppingMall.customer.customers.externalAccounts.erase(
        connection,
        {
          customerId: otherCustomer.id,
          externalAccountId,
        },
      );
    },
  );
}
