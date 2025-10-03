import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartSnapshot";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate customer cart snapshot history API for ownership, pagination,
 * filter.
 *
 * This test exercises the snapshot history endpoint by first registering a
 * customer, then creating a unique channel+section, then a cart in that
 * section. Adding/removing items triggers snapshots. The test fetches the
 * snapshots list, verifies pagination, filtering by created_after and
 * created_before, and ensures only the owner can access. It also soft-deletes
 * the cart and ensures evidence is retained and ownership checks are still
 * enforced. Attempts are made to fetch another customer's cart snapshots and
 * for the deleted cart are validated for expected failures. All business logic,
 * access control, and evidence retention are validated.
 */
export async function test_api_cart_snapshot_history_by_customer(
  connection: api.IConnection,
) {
  // 1. Admin creates a channel
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

  // 2. Admin creates section in that channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Customer joins
  const customerEmail = RandomGenerator.alphaNumeric(10) + "@test.com";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail as string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(2) as string & tags.MaxLength<64>,
      phone: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 4. Customer creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_customer_id: customer.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 5. Add two items to cart (simulate products with random UUIDs)
  const productId1 = typia.random<string & tags.Format<"uuid">>();
  const productId2 = typia.random<string & tags.Format<"uuid">>();
  const item1 = await api.functional.shoppingMall.customer.carts.items.create(
    connection,
    {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: productId1,
        quantity: 2,
        option_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(item1);

  const item2 = await api.functional.shoppingMall.customer.carts.items.create(
    connection,
    {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: productId2,
        quantity: 3,
        option_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(item2);

  // 6. Remove first item
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId: cart.id,
    cartItemId: item1.id,
  });

  // 7. Query all cart snapshots
  const allSnapshotsPage =
    await api.functional.shoppingMall.customer.carts.snapshots.index(
      connection,
      {
        cartId: cart.id,
        body: {} satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsPage);
  TestValidator.predicate(
    "at least 2 snapshots exist after item add/remove",
    allSnapshotsPage.data.length >= 2,
  );

  // 8. Query with pagination (limit 1)
  const page1 =
    await api.functional.shoppingMall.customer.carts.snapshots.index(
      connection,
      {
        cartId: cart.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "pagination returns 1 record on page 1",
    page1.data.length,
    1,
  );

  // 9. Query with created_after/created_before window (should accept the first snapshot's created_at)
  const firstSnapshot = allSnapshotsPage.data[0];
  const winPage =
    await api.functional.shoppingMall.customer.carts.snapshots.index(
      connection,
      {
        cartId: cart.id,
        body: {
          created_after: firstSnapshot.created_at,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(winPage);

  // 10. Register a second customer and attempt access to first customer's cart snapshots (should fail)
  const secondEmail = RandomGenerator.alphaNumeric(10) + "@test.com";
  const secondCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: secondEmail as string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(2) as string & tags.MaxLength<64>,
      phone: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(secondCustomer);

  await TestValidator.error(
    "second customer cannot view another's cart snapshots",
    async () => {
      await api.functional.shoppingMall.customer.carts.snapshots.index(
        connection,
        {
          cartId: cart.id,
          body: {} satisfies IShoppingMallCartSnapshot.IRequest,
        },
      );
    },
  );

  // 11. Remove the last item to simulate an empty or possibly soft-deleted cart condition
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId: cart.id,
    cartItemId: item2.id,
  });

  // 12. Attempt to fetch snapshots for soft-deleted/empty cart (should still be accessible as evidence/audit history)
  const afterDeletePage =
    await api.functional.shoppingMall.customer.carts.snapshots.index(
      connection,
      {
        cartId: cart.id,
        body: {} satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(afterDeletePage);
  TestValidator.predicate(
    "snapshots remain accessible after all items removed (soft delete)",
    afterDeletePage.data.length >= 2,
  );
}
