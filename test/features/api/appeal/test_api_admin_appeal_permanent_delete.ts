import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test that an admin can permanently delete a resolved (or invalid) appeal
 * record after its lifecycle is complete, enforcing all audit and compliance
 * rules.
 *
 * 1. Admin registers and authenticates.
 * 2. Customer registers and authenticates.
 * 3. Customer creates a shipping address for the order.
 * 4. Admin creates a payment method snapshot for the order.
 * 5. Customer creates a new order referencing the address and payment method.
 * 6. Customer creates an escalation (dispute case) for the order.
 * 7. Customer creates a new appeal for the escalation.
 * 8. Admin updates the appeal to resolved state prior to deletion attempt.
 * 9. Admin deletes the appeal and verifies it cannot be accessed afterwards.
 * 10. Attempt to delete an already deleted or non-existent appeal returns error.
 * 11. Attempting to delete an unresolved appeal is forbidden and returns error.
 */
export async function test_api_admin_appeal_permanent_delete(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(14),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer registers and authenticates.
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(14),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.alphabets(5),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Customer creates order shipping address (snapshot)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Admin creates payment method snapshot for the order
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"masked":"****1234"}',
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Customer creates a new order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Customer creates escalation for this order
  const escalation: IShoppingMallEscalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: "order_not_received",
        escalation_status: "pending",
      } satisfies IShoppingMallEscalation.ICreate,
    });
  typia.assert(escalation);

  // 7. Customer creates appeal for this escalation
  const appeal: IShoppingMallAppeal =
    await api.functional.shoppingMall.customer.appeals.create(connection, {
      body: {
        escalation_id: escalation.id,
        appeal_type: "refund_denied",
        explanation: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallAppeal.ICreate,
    });
  typia.assert(appeal);

  // 8. Admin (ensure authenticated) updates appeal to resolved status
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      full_name: admin.full_name,
      password: admin.token.access.substring(0, 14),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  const resolvedAppeal: IShoppingMallAppeal =
    await api.functional.shoppingMall.admin.appeals.update(connection, {
      appealId: appeal.id,
      body: {
        appeal_status: "resolved",
        resolution_type: "refund-granted",
        resolution_comment: "Refund issued as goodwill. Case closed.",
      } satisfies IShoppingMallAppeal.IUpdate,
    });
  typia.assert(resolvedAppeal);

  // 9. Admin deletes the appeal
  await api.functional.shoppingMall.admin.appeals.erase(connection, {
    appealId: resolvedAppeal.id,
  });

  // 10. Try to delete again (should error)
  await TestValidator.error(
    "deleting already deleted appeal fails",
    async () => {
      await api.functional.shoppingMall.admin.appeals.erase(connection, {
        appealId: resolvedAppeal.id,
      });
    },
  );

  // 11. Try to delete non-existent appeal
  await TestValidator.error("deleting non-existent appeal fails", async () => {
    await api.functional.shoppingMall.admin.appeals.erase(connection, {
      appealId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 12. Try unresolved appeal deletion
  const freshAppeal: IShoppingMallAppeal =
    await api.functional.shoppingMall.customer.appeals.create(connection, {
      body: {
        escalation_id: escalation.id,
        appeal_type: "policy_review_request",
        explanation: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallAppeal.ICreate,
    });
  typia.assert(freshAppeal);
  await TestValidator.error("cannot delete unresolved appeal", async () => {
    await api.functional.shoppingMall.admin.appeals.erase(connection, {
      appealId: freshAppeal.id,
    });
  });
}
