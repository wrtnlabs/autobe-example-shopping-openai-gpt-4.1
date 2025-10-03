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
 * Validate admin-driven soft deletion (logical deletion) of a customer account.
 *
 * 1. Register a privileged admin and login (admin join)
 * 2. Admin creates channel
 * 3. Admin creates section in that channel
 * 4. Register a customer in that channel/section (customer join)
 * 5. Admin soft-deletes (DELETE) the customer by customerId
 * 6. Attempt a second DELETE call on the customer: expect business logic error
 *    (cannot delete twice)
 *
 * Note: Customer re-login access block, data masking, and deleted_at checks
 * cannot be validated because there is no GET endpoint for reading a customer
 * or a login endpoint for customer. Therefore, these aspects are omitted in the
 * test logic.
 */
export async function test_api_customer_soft_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a privileged admin and login
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "admin email matches input",
    adminAuthorized.email,
    adminBody.email,
  );

  // 2. Admin creates a channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);
  TestValidator.equals(
    "channel code matches input",
    channel.code,
    channelBody.code,
  );

  // 3. Admin creates a section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);
  TestValidator.equals(
    "section channel id matches channel",
    section.shopping_mall_channel_id,
    channel.id,
  );

  // 4. Register a customer in the channel/section
  const customerBody = {
    shopping_mall_channel_id: channel.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    { body: customerBody },
  );
  typia.assert(customerAuthorized);
  TestValidator.equals(
    "customer email matches input",
    customerAuthorized.email,
    customerBody.email,
  );
  TestValidator.equals(
    "customer channel matches registration",
    customerAuthorized.shopping_mall_channel_id,
    channel.id,
  );

  // 5. Admin soft-deletes the customer by customerId
  await api.functional.shoppingMall.admin.customers.erase(connection, {
    customerId: customerAuthorized.id,
  });

  // 6. Try a second DELETE to confirm business error occurs
  await TestValidator.error(
    "cannot soft delete already deleted customer",
    async () => {
      await api.functional.shoppingMall.admin.customers.erase(connection, {
        customerId: customerAuthorized.id,
      });
    },
  );
}
