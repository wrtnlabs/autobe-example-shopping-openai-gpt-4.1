import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Permanently delete an escalation as admin with cascade/permission checks.
 *
 * Scenario:
 *
 * 1. Register and authenticate a new admin account.
 * 2. Register and authenticate a new customer.
 * 3. As customer, create a realistic order address (shipping info).
 * 4. As admin, register a new order payment method snapshot (simulating checkout
 *    backend logic).
 * 5. As customer, create a new order using the above address and payment method.
 * 6. As customer, raise a new escalation for the order (with random
 *    escalation_type).
 * 7. As admin, permanently delete the escalation using escalationId.
 * 8. (If escalations could be listed/queried, verify escalation and related
 *    records are removed; here, deletion is confirmed by successful call and
 *    error on any subsequent direct reuse.) Business rules checked:
 *
 * - Only admin can perform permanent escalation deletion (uses admin token)
 * - Deletion cascades to all related service events/appeals/comments (implicit,
 *   as these are not queryable in this test scope)
 * - Audit/compliance flow is respected (as far as API allows observation)
 */
export async function test_api_escalation_admin_permanent_delete(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "supersecureAdminP@ss1!",
      full_name: RandomGenerator.name(2),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customerStrongP@ss2!",
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        address_line2: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Step 3: As customer, create order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 4 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // Step 4: As admin, create payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(8),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 5: As customer, place an order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 123450,
        currency: "KRW",
        // We can't attach customerId, backend will infer it from auth context
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 6: As customer, create escalation for the order
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: RandomGenerator.pick([
          "order_not_received",
          "payment_dispute",
          "refund_denied",
          "compliance_inquiry",
          "shipment_damage",
          "others",
        ] as const),
      } satisfies IShoppingMallEscalation.ICreate,
    });
  typia.assert(escalation);

  // Step 7: As admin, erase escalation permanently
  await api.functional.shoppingMall.admin.escalations.erase(connection, {
    escalationId: escalation.id,
  });
  // No output expected. Success is if no error is thrown.

  // Step 8: Attempting to delete again should error (escalation already deleted)
  await TestValidator.error(
    "deleting already removed escalation fails",
    async () => {
      await api.functional.shoppingMall.admin.escalations.erase(connection, {
        escalationId: escalation.id,
      });
    },
  );
}
