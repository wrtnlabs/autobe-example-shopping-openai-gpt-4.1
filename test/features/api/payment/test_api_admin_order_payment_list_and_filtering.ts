import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * E2E test for admin listing (patch) payments of an order (paginated,
 * filterable).
 *
 * 1. Register and authenticate as a new admin.
 * 2. Create a new channel as admin.
 * 3. Create a new section under the channel as admin.
 * 4. Create a customer cart linked to the above channel/section.
 * 5. Create an order referencing the cart, channel, and section.
 * 6. Add multiple payments to the order with distinct payment_type and status
 *    values.
 * 7. List payments for the order (no filter): verify all created payments are
 *    returned (paginated, nonzero total).
 * 8. List payments filtering by each status: verify only matching payments are
 *    returned (test 'pending', 'paid', 'cancelled', 'refunded', etc).
 * 9. List payments filtering by each payment_type: verify only matching types are
 *    returned (e.g., 'card', 'deposit').
 * 10. List payments using created_at/requested_at date ranges: verify subset
 *     returned as expected.
 * 11. List payments with currency filter: verify only those with matching currency
 *     are returned.
 * 12. List payments with no matching filter: verify returns empty list and correct
 *     pagination meta.
 * 13. List payments for an order ID with zero payments: verify correct shape, zero
 *     data, valid pagination meta.
 * 14. Assert type safety and business correctness at every step: use typia.assert,
 *     TestValidator.equals, strict DTO typing.
 * 15. No type error/invalid-type/extra-property scenarios are tested.
 */
export async function test_api_admin_order_payment_list_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const adminEmail = `${RandomGenerator.alphaNumeric(12)}@example.com`;
  const adminJoin = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoin.email);

  // Step 2: Create a new channel
  const channelCreate = {
    code: `auto-${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreate,
    });
  typia.assert(channel);

  // Step 3: Create a new section in the channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: `section-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);

  // Step 4: Create a customer cart (simulate customer_id and referencing channel/section)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cartCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: RandomGenerator.pick(["guest", "member", "migration"] as const),
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(cart);

  // Step 5: Create an order referencing the cart, channel, section
  // Generate at least one order item
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: undefined!, // will be filled by backend
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: sellerId,
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 9000,
    discount_snapshot: JSON.stringify({ discount: 1000 }),
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: undefined!,
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.content({ paragraphs: 1 }),
    delivery_message: RandomGenerator.paragraph({ sentences: 2 }),
    delivery_status: "prepared",
    delivery_attempts: 0 as number & tags.Type<"int32">,
  };
  // Setup three distinct payment types/status/currencies for cross-filtering
  const now = new Date();
  const paymentTypes = ["card", "deposit", "mileage"] as const;
  const paymentStatuses = ["pending", "paid", "refunded"] as const;
  const currencies = ["USD", "KRW", "EUR"] as const;

  // Build payments manually
  const paymentsToCreate: IShoppingMallPayment.ICreate[] = ArrayUtil.repeat(
    3,
    (i) => ({
      shopping_mall_order_id: undefined!,
      shopping_mall_customer_id: customerId,
      payment_type: paymentTypes[i],
      external_payment_ref: `EXTPAY-${RandomGenerator.alphaNumeric(8)}`,
      status: paymentStatuses[i],
      amount: 5000 * (i + 1),
      currency: currencies[i],
      requested_at: new Date(now.getTime() + 1000 * i).toISOString(), // space dates by 1s each
    }),
  );

  // Compose order create
  const orderCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: `EXTORD-${RandomGenerator.alphaNumeric(8)}`,
    order_type: "normal",
    total_amount: paymentsToCreate.reduce((sum, p) => sum + p.amount, 0),
    currency: currencies[0],
    order_items: [orderItem],
    deliveries: [delivery],
    payments: paymentsToCreate,
    after_sale_services: undefined,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // Step 6: (Edge) create an order with no payments for empty edge case validation
  const orderCreateEmpty = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    order_type: "normal",
    total_amount: 0,
    currency: currencies[0],
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [],
    after_sale_services: undefined,
  } satisfies IShoppingMallOrder.ICreate;
  const orderEmpty: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderCreateEmpty,
    });
  typia.assert(orderEmpty);

  //---
  // Step 7: List all payments (no filter); check all three are returned
  const pageLimit = 10 as number & tags.Type<"int32">;
  const indexAll =
    await api.functional.shoppingMall.admin.orders.payments.index(connection, {
      orderId: order.id,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: pageLimit,
      },
    });
  typia.assert(indexAll);
  TestValidator.equals(
    "all payments returned for order",
    indexAll.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total count correct",
    indexAll.pagination.records,
    3,
  );
  // Cross-check returned payment IDs and summary shape
  const returnedIds = indexAll.data.map((x) => x.id);
  TestValidator.predicate(
    "returned IDs all unique",
    new Set(returnedIds).size === 3,
  );
  typia.assert<IPageIShoppingMallPayment.ISummary>(indexAll);

  //---
  // Step 8: Filter by status
  for (let i = 0; i < paymentStatuses.length; ++i) {
    const filterStatus = paymentStatuses[i];
    const indexStatus =
      await api.functional.shoppingMall.admin.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            status: filterStatus,
            page: 1 as number & tags.Type<"int32">,
            limit: pageLimit,
          },
        },
      );
    typia.assert(indexStatus);
    TestValidator.equals(
      `payments with status=${filterStatus}`,
      indexStatus.data.length,
      1,
    );
    const anyMatch = indexStatus.data.some((p) => p.status === filterStatus);
    TestValidator.predicate(`status match for ${filterStatus}`, anyMatch);
    // Confirm records only match filtered status
    for (const payment of indexStatus.data) {
      TestValidator.equals(
        `status correct for ${filterStatus}`,
        payment.status,
        filterStatus,
      );
    }
  }

  //---
  // Step 9: Filter by payment type
  for (let i = 0; i < paymentTypes.length; ++i) {
    const filterType = paymentTypes[i];
    const indexType =
      await api.functional.shoppingMall.admin.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            payment_type: filterType,
            page: 1 as number & tags.Type<"int32">,
            limit: pageLimit,
          },
        },
      );
    typia.assert(indexType);
    TestValidator.equals(
      `payments with type=${filterType}`,
      indexType.data.length,
      1,
    );
    const anyMatch = indexType.data.some((p) => p.payment_type === filterType);
    TestValidator.predicate(`type match for ${filterType}`, anyMatch);
    for (const payment of indexType.data) {
      TestValidator.equals(
        `type correct for ${filterType}`,
        payment.payment_type,
        filterType,
      );
    }
  }

  //---
  // Step 10: Filter by requested_at date range (pick 2nd payment's TS for slicing)
  const secondRequestedAt = paymentsToCreate[1].requested_at;
  const indexDate =
    await api.functional.shoppingMall.admin.orders.payments.index(connection, {
      orderId: order.id,
      body: {
        date_from: secondRequestedAt,
        page: 1 as number & tags.Type<"int32">,
        limit: pageLimit,
      },
    });
  typia.assert(indexDate);
  TestValidator.equals("date range filtered count", indexDate.data.length, 2);
  // Confirm all payments in result have requested_at >= date_from
  for (const payment of indexDate.data) {
    TestValidator.predicate(
      "requested_at after date_from",
      payment.requested_at >= secondRequestedAt,
    );
  }

  //---
  // Step 11: Filter by currency
  for (let i = 0; i < currencies.length; ++i) {
    const filterCurrency = currencies[i];
    const indexCurrency =
      await api.functional.shoppingMall.admin.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            currency: filterCurrency,
            page: 1 as number & tags.Type<"int32">,
            limit: pageLimit,
          },
        },
      );
    typia.assert(indexCurrency);
    TestValidator.equals(
      `payments with currency=${filterCurrency}`,
      indexCurrency.data.length,
      1,
    );
    const anyMatch = indexCurrency.data.some(
      (p) => p.currency === filterCurrency,
    );
    TestValidator.predicate(`currency match for ${filterCurrency}`, anyMatch);
    for (const payment of indexCurrency.data) {
      TestValidator.equals(
        `currency correct for ${filterCurrency}`,
        payment.currency,
        filterCurrency,
      );
    }
  }

  //---
  // Step 12: List payments using a filter that matches nothing
  const indexNotFound =
    await api.functional.shoppingMall.admin.orders.payments.index(connection, {
      orderId: order.id,
      body: {
        payment_type: "none-such-type",
        page: 1 as number & tags.Type<"int32">,
        limit: pageLimit,
      },
    });
  typia.assert(indexNotFound);
  TestValidator.equals(
    "no results for unmatched filter",
    indexNotFound.data.length,
    0,
  );
  TestValidator.equals(
    "pagination meta has zero records",
    indexNotFound.pagination.records,
    0,
  );

  //---
  // Step 13: List payments for an order with no payments (the empty order)
  const indexEmptyOrder =
    await api.functional.shoppingMall.admin.orders.payments.index(connection, {
      orderId: orderEmpty.id,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: pageLimit,
      },
    });
  typia.assert(indexEmptyOrder);
  TestValidator.equals(
    "empty order payments data is empty",
    indexEmptyOrder.data.length,
    0,
  );
  TestValidator.equals(
    "empty order pagination zero records",
    indexEmptyOrder.pagination.records,
    0,
  );
  // Confirm summary structure
  typia.assert<IPageIShoppingMallPayment.ISummary>(indexEmptyOrder);
}
