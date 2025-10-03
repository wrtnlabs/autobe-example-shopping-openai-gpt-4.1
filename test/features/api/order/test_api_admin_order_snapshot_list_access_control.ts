import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate admin listing of all snapshots for an order (audit, rollback,
 * compliance).
 *
 * 1. Register a new admin (ensures clean context and admin auth token is set for
 *    connection).
 * 2. Create a new channel (required for downstream section/order workflows).
 * 3. Create a section under that channel.
 * 4. Register a customer cart in the newly created section/channel (simulate
 *    customer flow).
 * 5. As admin, create an order from the cart (minimum-viable order, since snapshot
 *    flow is not about normal fulfillment).
 * 6. Verify admin can list ALL snapshots for the order:
 *
 *    - (a) Paginate over all results.
 *    - (b) Apply exact snapshot_id filter (for first or last snapshot returned).
 *    - (c) Filter using timestamp (created_at_start, created_at_end). Boundary and
 *         miss cases.
 *    - (d) Apply max/min pagination boundaries, check zero (miss) case for
 *         extreme/out-of-bounds page/filter.
 * 7. Validate structure and audit fields of snapshot objects (id,
 *    shopping_mall_order_id, created_at, snapshot_data are always present).
 * 8. Negative: Attempt unauthorized access (simulate by switching connection to
 *    empty headers or removing token, check error thrown, no data is
 *    returned).
 */
export async function test_api_admin_order_snapshot_list_access_control(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
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
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create customer cart (simulate customer id for now)
  // Cart requires shopping_mall_customer_id - we use a new UUID for simulation.
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
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
  typia.assert(cart);

  // 5. Create order (simulate MVO: minimum item, payment, delivery)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: fakeCustomerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(), // dummy order uuid before real link
            shopping_mall_product_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            discount_snapshot: null,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_shipment_id: undefined,
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph({ sentences: 7 }),
            delivery_message: undefined,
            delivery_status: "prepared",
            delivery_attempts: 1,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: fakeCustomerId,
            payment_type: "card",
            external_payment_ref: undefined,
            status: "pending",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
        after_sale_services: undefined,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Admin lists all snapshots for the order (basic/no filters)
  const snapshotList: IPageIShoppingMallOrderSnapshot =
    await api.functional.shoppingMall.admin.orders.snapshots.index(connection, {
      orderId: order.id,
      body: {} satisfies IShoppingMallOrderSnapshot.IRequest,
    });
  typia.assert(snapshotList);
  TestValidator.predicate(
    "admin receives at least one snapshot entry",
    snapshotList.data.length > 0,
  );
  const firstSnapshot = snapshotList.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot shopping_mall_order_id matches order",
    firstSnapshot.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "snapshot has id, order_id, snapshot_data, created_at",
    !!firstSnapshot.id &&
      !!firstSnapshot.shopping_mall_order_id &&
      !!firstSnapshot.snapshot_data &&
      !!firstSnapshot.created_at,
  );

  // 6a-b. Paginate, filter by snapshot id, created_at window (exact, miss, boundary)
  // -- Pagination: custom limit = 1 (should return exactly one item on first page)
  const listPage1 =
    await api.functional.shoppingMall.admin.orders.snapshots.index(connection, {
      orderId: order.id,
      body: { limit: 1, page: 1 } satisfies IShoppingMallOrderSnapshot.IRequest,
    });
  typia.assert(listPage1);
  TestValidator.equals(
    "limit 1 returns 1 data for page 1",
    listPage1.data.length,
    1,
  );
  TestValidator.equals("pagination current=1", listPage1.pagination.current, 1);
  TestValidator.equals("pagination limit=1", listPage1.pagination.limit, 1);

  // -- Pagination: page out of range (should return empty data array)
  const outOfRangePage =
    await api.functional.shoppingMall.admin.orders.snapshots.index(connection, {
      orderId: order.id,
      body: {
        limit: 1,
        page: 999,
      } satisfies IShoppingMallOrderSnapshot.IRequest,
    });
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "pagination miss returns 0 data",
    outOfRangePage.data.length,
    0,
  );

  // -- Exact filter: snapshot_id
  if (firstSnapshot && firstSnapshot.id) {
    const filteredBySnapshotId =
      await api.functional.shoppingMall.admin.orders.snapshots.index(
        connection,
        {
          orderId: order.id,
          body: {
            order_snapshot_id: firstSnapshot.id,
          } satisfies IShoppingMallOrderSnapshot.IRequest,
        },
      );
    typia.assert(filteredBySnapshotId);
    TestValidator.equals(
      "filter by snapshot id returns exactly 1 entry",
      filteredBySnapshotId.data.length,
      1,
    );
    TestValidator.equals(
      "filter snapshot id matches exactly",
      filteredBySnapshotId.data[0].id,
      firstSnapshot.id,
    );
  }

  // -- Filter: timestamp (created_at_start should work, created_at_end miss)
  const sinceOneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const filteredByDate =
    await api.functional.shoppingMall.admin.orders.snapshots.index(connection, {
      orderId: order.id,
      body: {
        created_at_start: sinceOneMinAgo,
      } satisfies IShoppingMallOrderSnapshot.IRequest,
    });
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "filter by recent created_at returns >= 1 result",
    filteredByDate.data.length >= 1,
  );

  // Filter miss case (future only)
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const missDateFilter =
    await api.functional.shoppingMall.admin.orders.snapshots.index(connection, {
      orderId: order.id,
      body: {
        created_at_start: future,
      } satisfies IShoppingMallOrderSnapshot.IRequest,
    });
  typia.assert(missDateFilter);
  TestValidator.equals(
    "filter by only future created_at gives no result",
    missDateFilter.data.length,
    0,
  );

  // 8. Negative: unauthorized/empty connection (simulated by wiping auth header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list admin snapshots",
    async () => {
      await api.functional.shoppingMall.admin.orders.snapshots.index(
        unauthConn,
        {
          orderId: order.id,
          body: {} satisfies IShoppingMallOrderSnapshot.IRequest,
        },
      );
    },
  );
}
