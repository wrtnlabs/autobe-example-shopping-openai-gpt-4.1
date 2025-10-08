import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";

/**
 * Validate admin retrieval of a detailed order status and event history for
 * audit/compliance.
 *
 * Steps:
 *
 * 1. Register a new admin
 * 2. Register a new customer and default address
 * 3. Create an order address snapshot (point-in-time shipping address, e.g.
 *    shipping)
 * 4. Create an order payment method snapshot (e.g. credit card)
 * 5. Customer places an order using these references
 * 6. As admin, retrieve the order status timeline via statusHistory.index
 * 7. Validate retrieval returns timeline entries with correct event types, actors,
 *    explanations, timestamps
 */
export async function test_api_order_status_history_admin_retrieval_for_compliance_audit(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Register a new customer with default address
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(12);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 10,
          }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 9,
          }),
          address_line2: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Step 3: Customer creates an order address snapshot for the order
  // (simulate the act of choosing shipping address on checkout)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
          address_detail: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 7,
          }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // Step 4: Admin creates payment method snapshot for the order
  // (simulate capturing payment method info at checkout)
  // For simplicity, admin creates to ensure permission (in actual, customer might via payment gateway, but use admin for this API)
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"masked_card": "****1234"}',
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 5: Customer places an order using refs
  const orderTotal = Math.floor(Math.random() * 50000) + 1000;
  const currency = "KRW";
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 6: As admin, retrieve the order status/timeline history
  // (after order placed, should have at least initial status events)
  const timelinePage: IPageIShoppingMallOrderStatusHistory =
    await api.functional.shoppingMall.admin.orders.statusHistory.index(
      connection,
      {
        orderId: order.id,
        body: {
          orderId: order.id,
          limit: 10,
          page: 1,
          // no additional filtering: retrieve full history
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(timelinePage);

  TestValidator.predicate(
    "timeline contains at least 1 event (order placed)",
    timelinePage.data.length >= 1,
  );
  TestValidator.predicate(
    "each event entry has event_type, actor fields, and created_at timestamp",
    timelinePage.data.every(
      (ev) =>
        typeof ev.event_type === "string" &&
        !!ev.created_at &&
        (ev.actor_customer_id !== undefined ||
          ev.actor_admin_id !== undefined ||
          ev.actor_seller_id !== undefined),
    ),
  );
  TestValidator.equals(
    "first timeline entry references correct order id",
    timelinePage.data[0].shopping_mall_order_id,
    order.id,
  );

  // Optional: check that all status transitions are in expected order if additional events were simulated/generated
}
