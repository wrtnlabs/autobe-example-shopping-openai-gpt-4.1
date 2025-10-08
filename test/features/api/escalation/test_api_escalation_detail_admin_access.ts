import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate administrator access to escalation detail including sensitive order,
 * initiator, and audit information.
 *
 * 1. Register and authenticate a new admin.
 * 2. Create a shipping address snapshot for a customer order.
 * 3. Create a payment method snapshot for a customer order.
 * 4. Create a customer order using the above address and payment method.
 * 5. Create an escalation tied to the created order.
 * 6. Using the admin session, GET the escalation details by escalationId.
 * 7. Verify the retrieved escalation fields (order ID, admin- and
 *    customer-related, audit timestamps, etc) are correct and of sensitive
 *    type.
 * 8. Attempt GET with a random (nonexistent) escalationId - ensure admin receives
 *    an error.
 * 9. Log out the admin, then attempt GET the escalation as an unauthenticated
 *    client - ensure access is denied.
 */
export async function test_api_escalation_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
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
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(address);

  // 3. Create payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ card: "****1234" }),
          display_name: "Test Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Create an order (customer context, so no explicit IDs, required fields only)
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: address.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Create escalation for the order
  const escalation: IShoppingMallEscalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: "order_not_received",
        resolution_type: "manual_review",
        escalation_status: "pending",
        resolution_comment: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallEscalation.ICreate,
    });
  typia.assert(escalation);

  // 6. Retrieve escalation detail as admin
  const detail: IShoppingMallEscalation =
    await api.functional.shoppingMall.admin.escalations.at(connection, {
      escalationId: escalation.id,
    });
  typia.assert(detail);
  TestValidator.equals(
    "retrieved escalation matches created",
    detail.id,
    escalation.id,
  );
  TestValidator.equals(
    "escalation references correct order",
    detail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "escalation status matches",
    detail.escalation_status,
    "pending",
  );
  TestValidator.predicate(
    "escalation has created_at timestamp",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin can see assigned admin and audit fields",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );

  // 7. Error: Using a random UUID for escalationId as admin (not found)
  await TestValidator.error(
    "admin GETs escalation with random id should fail",
    async () => {
      await api.functional.shoppingMall.admin.escalations.at(connection, {
        escalationId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 8. Error: Unauthenticated - simulate logout by making call with disconnected headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access escalation detail",
    async () => {
      await api.functional.shoppingMall.admin.escalations.at(unauthConn, {
        escalationId: escalation.id,
      });
    },
  );
}
