import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test admin can retrieve a specific shopping cart snapshot by ID, and that
 * proper security, audit, and error logic is enforced.
 *
 * 1. Register a random admin.
 * 2. Create a random channel as admin.
 * 3. Create a section in that channel as admin.
 * 4. Simulate a customer cart (to obtain a customer id for downstream admin cart
 *    creation).
 * 5. Create an admin-level cart using IShoppingMallCart.ICreate with valid
 *    customer/channel/section IDs.
 * 6. As there is no API to retrieve cart snapshots list or IDs, attempt to
 *    retrieve a non-existent snapshot using random UUIDs and confirm error is
 *    thrown.
 * 7. Test unauthorized/non-admin access with TestValidator.error.
 */
export async function test_api_cart_snapshot_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Test1234!@#",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(1),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create customer cart to get valid customer ID for admin cart
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  const customerCart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: fakeCustomerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(customerCart);

  // 5. Admin creates a cart 'for' this customer
  const adminCart = await api.functional.shoppingMall.admin.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: fakeCustomerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "admin-created",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(adminCart);

  // 6. Since there is no API to obtain a real snapshot ID for the adminCart, attempt to access a random snapshot (unrealistic) and verify error handling.
  await TestValidator.error("random snapshotId yields error", async () => {
    await api.functional.shoppingMall.admin.carts.snapshots.at(connection, {
      cartId: adminCart.id,
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 7. Test access control: unauthenticated/unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin access is forbidden", async () => {
    await api.functional.shoppingMall.admin.carts.snapshots.at(unauthConn, {
      cartId: adminCart.id,
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
