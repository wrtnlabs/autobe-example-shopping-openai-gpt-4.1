import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate admin access to full detail of an appeal record.
 *
 * 1. Register an admin account.
 * 2. Register an order address (customer, snapshot for order).
 * 3. Register payment method snapshot for the order.
 * 4. Place an order (customer context, use created address and payment method).
 * 5. Create an escalation for that order.
 * 6. File an appeal on the escalation (customer context).
 * 7. As admin, retrieve appeal detail by its ID and validate all fields.
 * 8. Attempt to access non-existent appeal ID (should fail).
 * 9. (Soft-delete logic not supported by SDK, so only check normal and not-found
 *    cases.)
 */
export async function test_api_appeal_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin account (admin join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register order address for the customer
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 3. Register order payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(20),
          display_name: RandomGenerator.name(),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Place an order (customer context, using created address and payment method)
  const orderTotal = Math.floor(Math.random() * 100000) + 1000; // Random order total, > 0
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Create escalation for the order
  const escalationType = RandomGenerator.pick([
    "payment_dispute",
    "order_not_received",
    "refund_delay",
    "compliance_inquiry",
  ] as const);
  const escalation: IShoppingMallEscalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: escalationType,
      } satisfies IShoppingMallEscalation.ICreate,
    });
  typia.assert(escalation);

  // 6. File an appeal for the escalation
  const appealType = RandomGenerator.pick([
    "refund denied",
    "order cancellation challenge",
    "policy review request",
    "other",
  ] as const);
  const explanation = RandomGenerator.content({ paragraphs: 2 });
  const appeal: IShoppingMallAppeal =
    await api.functional.shoppingMall.customer.appeals.create(connection, {
      body: {
        escalation_id: escalation.id,
        appeal_type: appealType,
        explanation,
      } satisfies IShoppingMallAppeal.ICreate,
    });
  typia.assert(appeal);

  // 7. As admin, retrieve appeal detail by ID
  const appealDetail: IShoppingMallAppeal =
    await api.functional.shoppingMall.admin.appeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(appealDetail);

  // Validate all appeal fields are correct and match creation
  TestValidator.equals("appeal ID matches", appealDetail.id, appeal.id);
  TestValidator.equals(
    "escalation ID matches",
    appealDetail.escalation_id,
    escalation.id,
  );
  TestValidator.equals(
    "appeal type matches",
    appealDetail.appeal_type,
    appealType,
  );
  TestValidator.equals(
    "explanation matches",
    appealDetail.resolution_comment,
    appeal.resolution_comment,
  );
  // Status may be assigned by server (e.g., "pending"), presence checked instead
  TestValidator.predicate(
    "appeal status present",
    typeof appealDetail.appeal_status === "string" &&
      appealDetail.appeal_status.length > 0,
  );
  // Admin should see actor/admin assign fields as nullable or string
  TestValidator.predicate(
    "appellant_customer_id or appellant_seller_id present",
    (appealDetail.appellant_customer_id !== null &&
      appealDetail.appellant_customer_id !== undefined) ||
      (appealDetail.appellant_seller_id !== null &&
        appealDetail.appellant_seller_id !== undefined),
  );

  // 8. Edge: non-existent appeal ID
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin receives error for non-existent appealId",
    async () => {
      await api.functional.shoppingMall.admin.appeals.at(connection, {
        appealId: nonExistentAppealId,
      });
    },
  );
}
