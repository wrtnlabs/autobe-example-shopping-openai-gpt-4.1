import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDelivery";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test admin privileged search and pagination of order deliveries.
 *
 * 1. Register a new admin account (api.functional.auth.admin.join)
 * 2. Create a cart for a random customer
 *    (api.functional.shoppingMall.customer.carts.create)
 * 3. Create an order as admin, linked to the cart
 *    (api.functional.shoppingMall.admin.orders.create)
 * 4. As the authenticated admin, query deliveries for that order using
 *    api.functional.shoppingMall.admin.orders.deliveries.index
 * 5. Provide advanced search filters (such as delivery_status, recipient_name,
 *    sort_by, page, limit)
 * 6. Validate that:
 *
 *    - All returned delivery summaries (in .data) correspond to the created order
 *    - Admin can search and paginate across potentially multiple deliveries
 *    - Filtering and sorting works as expected
 *    - Pagination metadata is correct (number of records/pages/limits correct)
 *    - Details (recipient, status, address) are fully visible to admin
 *
 * Steps:
 *
 * - Register new admin (store credentials if needed)
 * - Create random customer cart
 * - Create order as admin using that cart and generate some sample deliveries
 *   (potentially using array generation)
 * - Use deliveries.index PATCH API with no filters, and also with combinations of
 *   filters (delivery_status, recipient_name, created_at_from, sort_by, page,
 *   limit)
 * - Assert all returned .data records have order_id matching the created order,
 *   and that filtering is effective (using e.g. recipient_name substring,
 *   specific status, time bounds)
 * - Validate that pagination metadata corresponds to the number of matching
 *   records and returned deliveries
 */
export async function test_api_delivery_search_and_pagination_for_admin_order(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create a cart for a random customer
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cartBody = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: cartBody,
    },
  );
  typia.assert(cart);

  // 3. Create an order as admin, linked to the cart, with several deliveries
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // temp value (will be assigned by system)
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >() satisfies number as number,
    unit_price: 10000,
    final_price: 9000,
    discount_snapshot: null,
    status: "ordered",
  };
  const now = new Date();
  const deliveries = ArrayUtil.repeat(
    3,
    (i) =>
      ({
        shopping_mall_order_id: cart.id as string & tags.Format<"uuid">,
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
        delivery_message:
          i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : undefined,
        delivery_status:
          i === 0 ? "prepared" : i === 1 ? "dispatched" : "delivered",
        delivery_attempts: i,
      }) satisfies IShoppingMallDelivery.ICreate,
  );
  const orderBody = {
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: deliveries.length * 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries,
    payments: [
      {
        shopping_mall_order_id: cart.id as string & tags.Format<"uuid">,
        shopping_mall_customer_id: cart.shopping_mall_customer_id,
        payment_type: "card",
        external_payment_ref: null,
        status: "paid",
        amount: deliveries.length * 10000,
        currency: "KRW",
        requested_at: now.toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    ],
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 4. Query deliveries for the created order via admin deliveries.index
  // 4-1. No filter, default pagination
  const page1 = await api.functional.shoppingMall.admin.orders.deliveries.index(
    connection,
    {
      orderId: order.id,
      body: {},
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "all delivery summaries must have matching order_id",
    page1.data.every((s) => s.order_id === order.id),
  );

  // 4-2. With filter: delivery_status of the first delivery
  const statusFilter = deliveries[0].delivery_status;
  const pageFiltered =
    await api.functional.shoppingMall.admin.orders.deliveries.index(
      connection,
      {
        orderId: order.id,
        body: { delivery_status: statusFilter },
      },
    );
  typia.assert(pageFiltered);
  TestValidator.predicate(
    `all filtered deliveries are status ${statusFilter}`,
    pageFiltered.data.every((s) => s.delivery_status === statusFilter),
  );

  // 4-3. Pagination: page 2 with limit 1
  const pageLimit = 1;
  const page2 = await api.functional.shoppingMall.admin.orders.deliveries.index(
    connection,
    {
      orderId: order.id,
      body: { limit: pageLimit, page: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination reports correct current page",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination limit respected",
    page2.data.length <= pageLimit,
  );

  // 4-4. Filtering by recipient name (case-insensitive, substring)
  const needle = deliveries[1].recipient_name.substring(0, 2);
  const pageName =
    await api.functional.shoppingMall.admin.orders.deliveries.index(
      connection,
      {
        orderId: order.id,
        body: { recipient_name: needle },
      },
    );
  typia.assert(pageName);
  TestValidator.predicate(
    `deliveries page includes only names containing '${needle}'`,
    pageName.data.every((s) =>
      s.recipient_name.toLowerCase().includes(needle.toLowerCase()),
    ),
  );

  // 4-5. Sorting by created_at ascending
  const pageSorted =
    await api.functional.shoppingMall.admin.orders.deliveries.index(
      connection,
      {
        orderId: order.id,
        body: { sort_by: "created_at", sort_order: "asc" },
      },
    );
  typia.assert(pageSorted);
  const sorted = [...pageSorted.data].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  TestValidator.equals(
    "data is sorted by created_at ascending",
    pageSorted.data,
    sorted,
  );

  // 5. Presence of all delivery details for admin
  TestValidator.predicate(
    "admin sees all delivery fields",
    page1.data.every(
      (s) =>
        typeof s.address_snapshot === "string" &&
        typeof s.recipient_name === "string" &&
        typeof s.recipient_phone === "string",
    ),
  );
}
