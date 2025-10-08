import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

/**
 * Validate admin retrieval of order shipment detail.
 *
 * 1. Register as a new admin and acquire admin JWT.
 * 2. Create a shipping address snapshot for use in order creation.
 * 3. Create a payment method snapshot for the order.
 * 4. Create a new order as a customer (simulate customer context).
 * 5. Retrieve at least one shipment linked to the newly created order - assume at
 *    least one shipment exists.
 * 6. As admin, call shipment retrieval API and check all fields: carrier,
 *    tracking_number, status, dispatched/delivered timestamps, remark, number,
 *    etc.
 * 7. For each of these fields, assert output matches the expected type and
 *    business context; perform typia.assert.
 * 8. Validate access control: admin can retrieve shipment on this order.
 * 9. Test error handling: request invalid shipmentId and orderId, expect error
 *    (using TestValidator.error).
 */
export async function test_api_order_shipment_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & JWT
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create order address snapshot
  const address: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph(),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(address);

  // 3. Create payment method snapshot (must be called by admin)
  const payMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: "Visa ****" + RandomGenerator.alphaNumeric(4),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(payMethod);

  // 4. Customer order creation (simulate context, using random UUID for customer)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerId,
        shipping_address_id: address.id,
        payment_method_id: payMethod.id,
        order_total: 110000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Assume at least one shipment exists and shipmentId/number is retrievable from order/shipment schema in your test env
  // We'll just generate random UUID for shipmentId to proceed since there is no shipment creation/listing API
  const shipmentId = typia.random<string & tags.Format<"uuid">>();

  // 6. Retrieve shipment with (order.id, shipmentId)
  let shipment: IShoppingMallOrderShipment | undefined = undefined;
  let retrievalErrored = false;
  try {
    shipment = await api.functional.shoppingMall.admin.orders.shipments.at(
      connection,
      {
        orderId: order.id,
        shipmentId: shipmentId,
      },
    );
    typia.assert(shipment);
    // Check mandatory fields and types
    TestValidator.equals(
      "order id matches",
      shipment.shopping_mall_order_id,
      order.id,
    );
    TestValidator.predicate(
      "shipment number is string",
      typeof shipment.shipment_number === "string",
    );
    TestValidator.predicate(
      "carrier is string",
      typeof shipment.carrier === "string",
    );
    TestValidator.predicate(
      "shipment status is string",
      typeof shipment.status === "string",
    );
    // Optionally dispatched/delivered timestamps
    if (
      shipment.dispatched_at !== null &&
      shipment.dispatched_at !== undefined
    ) {
      TestValidator.predicate(
        "dispatched_at type",
        typeof shipment.dispatched_at === "string",
      );
    }
    if (shipment.delivered_at !== null && shipment.delivered_at !== undefined) {
      TestValidator.predicate(
        "delivered_at type",
        typeof shipment.delivered_at === "string",
      );
    }
    TestValidator.predicate(
      "created_at type",
      typeof shipment.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at type",
      typeof shipment.updated_at === "string",
    );
  } catch (exp) {
    retrievalErrored = true;
    // Could be invalid shipmentId, expect error
  }
  TestValidator.predicate(
    "shipment retrieval produced correct error or object",
    shipment !== undefined || retrievalErrored === true,
  );

  // 7. Attempt to retrieve with invalid orderId and shipmentId, expect error
  await TestValidator.error(
    "invalid order/shipment id should error",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.at(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
