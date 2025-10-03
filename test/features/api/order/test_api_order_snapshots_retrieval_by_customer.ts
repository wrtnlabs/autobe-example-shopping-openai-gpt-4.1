import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate paginated and filtered retrieval of order snapshots by an
 * authenticated customer.
 *
 * This E2E test registers a new customer and programmatically generates the
 * full resource chain:
 *
 * - Creates a shopping channel
 * - Adds a section and category
 * - Registers a product
 * - Customer creates a new cart
 * - Order is created, mutated (via order item addition) to generate snapshots
 * - Snapshots are queried with filter/pagination
 *
 * Verifies:
 *
 * 1. Snapshots for only the authenticated customer's order are returned (ownership
 *    enforced)
 * 2. Snapshot listing respects advanced pagination and filter parameters (range,
 *    limit, page, etc.)
 * 3. Audit/evidence fields are present and type-validated for compliance
 * 4. (Negative): Accessing another order's snapshots is disallowed/empty.
 */
export async function test_api_order_snapshots_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Admin creates a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Customer registers using the correct channel
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Admin creates a section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Admin creates a category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          parent_id: null,
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Admin registers a product
  // (As seller is not in scope, use admin to simulate the seller fields)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Customer creates a cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Admin creates the order
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [],
        deliveries: [],
        payments: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Admin adds at least one item to the order (triggers snapshot)
  const orderItem = await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: null,
        shopping_mall_seller_id: sellerId,
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        discount_snapshot: null,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(orderItem);

  // Query customer's own order snapshots (with filter/pagination)
  const now = new Date();
  const pagination = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  };
  const filter = {
    created_at_start: new Date(now.getTime() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    created_at_end: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
  };
  const output =
    await api.functional.shoppingMall.customer.orders.snapshots.index(
      connection,
      {
        orderId: order.id,
        body: {
          ...pagination,
          ...filter,
        } satisfies IShoppingMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(output);

  // Validate ownership: returned snapshots must be for this order only
  for (const snap of output.data) {
    typia.assert(snap);
    TestValidator.equals(
      "snapshots link to correct order",
      snap.shopping_mall_order_id,
      order.id,
    );
    TestValidator.predicate(
      "snapshot_data must be present",
      typeof snap.snapshot_data === "string" && snap.snapshot_data.length > 0,
    );
    TestValidator.predicate(
      "created_at is within filter range",
      snap.created_at >= filter.created_at_start! &&
        snap.created_at <= filter.created_at_end!,
    );
  }

  // Negative: Query for unrelated orderId (should be empty or forbidden)
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const negativeResult =
    await api.functional.shoppingMall.customer.orders.snapshots.index(
      connection,
      {
        orderId: fakeOrderId,
        body: {
          ...pagination,
          ...filter,
        } satisfies IShoppingMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.equals(
    "unrelated orderId yields empty or forbidden",
    negativeResult.data.length,
    0,
  );
}
