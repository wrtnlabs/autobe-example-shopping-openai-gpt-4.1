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
 * Validate the update of an appeal by admin, enforcing access control and
 * business logic: Only admins can update an appeal, valid
 * status/resolution/comment are stored and audited, completed appeals cannot be
 * updated, and unauthorized access is rejected. Steps:
 *
 * 1. Register and authenticate as customer and as admin.
 * 2. Customer creates required order address.
 * 3. Admin creates payment method snapshot.
 * 4. Customer places an order using the created address/payment snapshot.
 * 5. Customer creates an escalation for the order.
 * 6. Customer files an appeal related to the escalation.
 * 7. Admin updates the appeal status (to 'resolved') with detailed resolution and
 *    comment.
 * 8. Assert all fields correctly updated.
 * 9. Try update as non-admin user, expect error.
 * 10. Try to update a completed appeal, expect error.
 */
export async function test_api_admin_appeal_status_and_resolution_update(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPass1234";
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<100>,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "03187",
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;

  // 2. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1234";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.id;

  // 3. Customer creates order address snapshot
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<100>,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "03187",
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: "03187",
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Admin creates payment method snapshot
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"cardMask":"****1234"}',
          display_name: "VISA ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Customer places order
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<100>,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "03187",
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 45000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Customer creates escalation
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: "refund-request",
        resolution_type: "refund-issued",
        escalation_status: "pending",
        resolution_comment: "Requesting a refund for delayed shipment",
      } satisfies IShoppingMallEscalation.ICreate,
    });
  typia.assert(escalation);

  // 7. Customer creates appeal
  const appeal = await api.functional.shoppingMall.customer.appeals.create(
    connection,
    {
      body: {
        escalation_id: escalation.id,
        appeal_type: "refund denied",
        explanation: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IShoppingMallAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // 8. Admin updates appeal (happy path)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  const updated = await api.functional.shoppingMall.admin.appeals.update(
    connection,
    {
      appealId: appeal.id,
      body: {
        appeal_status: "resolved",
        resolution_type: "manual-override",
        resolution_comment: "Refund approved on manual review by admin.",
      } satisfies IShoppingMallAppeal.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "appeal status updated to resolved",
    updated.appeal_status,
    "resolved",
  );
  TestValidator.equals(
    "admin's resolution_type recorded",
    updated.resolution_type,
    "manual-override",
  );
  TestValidator.equals(
    "admin comment recorded",
    updated.resolution_comment,
    "Refund approved on manual review by admin.",
  );

  // 9. Attempt update as unauthorized (customer) - expect error
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<100>,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "03187",
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error(
    "customer cannot update an appeal (only admins allowed)",
    async () => {
      await api.functional.shoppingMall.admin.appeals.update(connection, {
        appealId: appeal.id,
        body: {
          appeal_status: "dismissed",
          resolution_type: "denied",
          resolution_comment: "Customer-initiated attempt. Should fail.",
        } satisfies IShoppingMallAppeal.IUpdate,
      });
    },
  );

  // 10. Attempt to update a completed (resolved) appeal again - expect error
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  await TestValidator.error(
    "cannot update already resolved appeal",
    async () => {
      await api.functional.shoppingMall.admin.appeals.update(connection, {
        appealId: appeal.id,
        body: {
          appeal_status: "resolved",
          resolution_type: "manual-override",
          resolution_comment: "Unnecessary repeat update on resolved appeal.",
        } satisfies IShoppingMallAppeal.IUpdate,
      });
    },
  );
}
