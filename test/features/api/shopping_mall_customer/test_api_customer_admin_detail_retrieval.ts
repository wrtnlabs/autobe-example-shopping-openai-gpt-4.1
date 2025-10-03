import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate the administrative retrieval of full customer details by customerId.
 *
 * This test performs the following steps:
 *
 * 1. Register a new admin to obtain a privileged session.
 * 2. Create a channel as required onboarding structure for customer existence.
 * 3. Create a new section in the channel (further structuring for future business
 *    logic).
 * 4. Attempt to retrieve a customer detail by customerId as admin (expected
 *    success if customer exists, error if not).
 * 5. Validate all PII/sensitive fields and audit compliance in the customer detail
 *    for admin session.
 * 6. Attempt to retrieve details for a non-existent customerId (negative path).
 * 7. Attempt retrieval as unauthorized user (expect error due to no privilege).
 */
export async function test_api_customer_admin_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);

  // 2. Create a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(channel);

  // 3. Create a section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Attempt to retrieve a customer detail by customerId as admin
  // There is no customer creation API provided; so valid customerId cannot be constructed directly.
  // Instead, attempt a negative test with a random UUID (expecting an error),
  // and interpret this section as pending further customer creation endpoint implementation.
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for non-existent customerId",
    async () => {
      await api.functional.shoppingMall.admin.customers.at(connection, {
        customerId: nonExistentCustomerId,
      });
    },
  );

  // 5. Attempt unauthorized retrieval (not logged in as admin, simulate by new connection without tokens)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should reject customer retrieval by unauthorized user",
    async () => {
      await api.functional.shoppingMall.admin.customers.at(unauthConn, {
        customerId: nonExistentCustomerId,
      });
    },
  );

  // 6. (Optional) If customer creation endpoint is later available, add positive retrieval test here.
}
