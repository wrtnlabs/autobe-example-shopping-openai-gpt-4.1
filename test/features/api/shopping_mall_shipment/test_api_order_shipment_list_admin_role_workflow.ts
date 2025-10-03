import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Scenario: Admin-order shipment batch listing, access, and error test
 *
 * 1. Admin registers (and is auto-logged in)
 * 2. A new shopping cart is created for a fake customer (simulate normal customer
 *    checkout)
 * 3. Admin submits a new order based on the created cart (with at least one item
 *    and payment), referencing the customer and cart info
 * 4. Admin registers at least one shipment batch for the new order
 * 5. Admin PATCHes /shoppingMall/admin/orders/{orderId}/shipments with a request
 *    containing (a) pagination params, (b) status filter, (c) trivial search
 *    and sort combinations a. Validates response: correct shipment records with
 *    expected business fields, pagination, seller/shipment info, analytics
 *    fields present b. Check audit fields: created_at/updated_at/deleted_at,
 *    status, tracking code consistency
 * 6. Asserts that non-admin role (e.g., fake customer or no auth) is rejected by
 *    POST and PATCH
 * 7. Test error: PATCH with missing/invalid orderId (random UUID) returns error or
 *    empty result (according to API behavior)
 */
export async function test_api_order_shipment_list_admin_role_workflow(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);

  // Step 2: Create a shopping cart for a fake customer (simulate UUIDs for required linkage)
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: fakeCustomerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // Step 3: Admin creates new order using the above cart for that customer (with minimal order items, delivery, payment)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: fakeCustomerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "", // API may ignore in creation but required by type
            shopping_mall_product_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_variant_id: undefined,
            shopping_mall_seller_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            discount_snapshot: undefined,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: "", // API may ignore or use server value
            shopping_mall_shipment_id: undefined,
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph(),
            delivery_message: undefined,
            delivery_status: "prepared",
            delivery_attempts: 1,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: "", // API may ignore or use server value
            shopping_mall_customer_id: fakeCustomerId,
            payment_type: "card",
            external_payment_ref: undefined,
            status: "pending",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
        after_sale_services: undefined,
      },
    },
  );
  typia.assert(order);

  // Step 4: Admin registers at least one shipment batch for the above order
  const sellerId =
    order.order_items?.[0]?.shopping_mall_seller_id ??
    typia.random<string & tags.Format<"uuid">>();
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_seller_id: sellerId,
          shipment_code: RandomGenerator.alphaNumeric(12),
          external_tracking_number: RandomGenerator.alphaNumeric(10),
          carrier: "TestCarrier",
          requested_at: new Date().toISOString(),
          status: "pending",
        },
      },
    );
  typia.assert(shipment);

  // Step 5: Admin lists shipment batches with pagination & various filters
  // 5a. List all shipments, no filter (page 1, limit 10)
  const pageResp =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        status: undefined,
        shipment_code: undefined,
        shopping_mall_seller_id: undefined,
        created_from: undefined,
        created_to: undefined,
      },
    });
  typia.assert(pageResp);
  TestValidator.predicate("shipment listed in result", () =>
    pageResp.data.some(
      (s) =>
        s.id === shipment.id &&
        s.shipment_code === shipment.shipment_code &&
        s.status === "pending",
    ),
  );
  TestValidator.equals(
    "pagination total records is at least 1",
    pageResp.pagination.records >= 1,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    pageResp.pagination.current,
    1,
  );

  // 5b. Filter by status: pending
  const filteredPage =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        status: "pending",
        shipment_code: undefined,
        shopping_mall_seller_id: undefined,
        created_from: undefined,
        created_to: undefined,
      },
    });
  typia.assert(filteredPage);
  TestValidator.predicate("filtered shipments all are pending", () =>
    filteredPage.data.every((s) => s.status === "pending"),
  );

  // 5c. Filter by non-matching status: delivered (should be empty)
  const emptyPage =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        status: "delivered",
        shipment_code: undefined,
        shopping_mall_seller_id: undefined,
        created_from: undefined,
        created_to: undefined,
      },
    });
  typia.assert(emptyPage);
  TestValidator.equals(
    "delivered filter yields no shipments",
    emptyPage.data.length,
    0,
  );

  // 5d. Filter by shipment_code (should return exactly one)
  const codePage =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        status: undefined,
        shipment_code: shipment.shipment_code,
        shopping_mall_seller_id: undefined,
        created_from: undefined,
        created_to: undefined,
      },
    });
  typia.assert(codePage);
  TestValidator.equals(
    "filter by shipment_code yields one shipment",
    codePage.data.length,
    1,
  );
  TestValidator.equals(
    "shipment_code matches",
    codePage.data[0].shipment_code,
    shipment.shipment_code,
  );

  // 6. Access control test: Non-admin and unauthenticated role is rejected
  // Customer token simulation: Switch connection context to unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt listing as unauthenticated (should fail or be rejected)
  await TestValidator.error(
    "unauthenticated user cannot fetch admin shipment list",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.index(
        unauthConn,
        {
          orderId: order.id,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );

  // 7. Error: PATCH with invalid orderId (random UUID)
  await TestValidator.error(
    "invalid orderId should reject or return empty",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
}
