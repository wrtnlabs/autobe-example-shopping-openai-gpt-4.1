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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test for admin updating an escalation case linked to a seller-raised
 * order issue. Validates escalation status transitions, admin assignment, and
 * resolution fields.
 *
 * Steps:
 *
 * 1. Register admin, seller, and customer (who provides initial address).
 * 2. Admin creates payment method snapshot.
 * 3. Customer creates shipping address and order.
 * 4. Seller creates escalation for that order.
 * 5. Admin updates escalation (status, assignment, and resolution fields).
 * 6. Validate changes: status, assignment to admin, resolution type/comment
 *    present and correct audit fields updated.
 */
export async function test_api_escalation_admin_update_workflow_and_resolution(
  connection: api.IConnection,
) {
  // 1. Create admin account (and authenticate)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin#1234",
        full_name: RandomGenerator.name(2),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create seller account (and authenticate)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Seller#1234",
        business_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
        kyc_document_uri: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Create customer account (and authenticate)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const addressCreate: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    region: "Seoul",
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  };
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Customer#1234",
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: addressCreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 4. Customer creates shipping address snapshot for the order
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: addressCreate.recipient_name,
          phone: addressCreate.phone,
          zip_code: addressCreate.postal_code,
          address_main: addressCreate.address_line1,
          address_detail: addressCreate.address_line2,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 5. Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ card_last4: "1234" }),
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 6. Customer creates order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: typia.random<number>(),
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 7. Seller creates escalation for that order
  const escalationCreate: IShoppingMallEscalation.ICreate = {
    shopping_mall_order_id: order.id,
    escalation_type: "order_not_received",
    resolution_type: undefined,
    escalation_status: undefined,
    resolution_comment: "Order not received by customer.",
  };
  const escalation: IShoppingMallEscalation =
    await api.functional.shoppingMall.seller.escalations.create(connection, {
      body: escalationCreate,
    });
  typia.assert(escalation);

  // 8. Admin updates escalation status, assigns case, and adds resolution
  const updateBody: IShoppingMallEscalation.IUpdate = {
    escalation_status: "resolved",
    escalation_type: escalation.escalation_type,
    resolution_type: "refund-issued",
    resolution_comment: "Refund granted after manual review.",
    assigned_admin_id: admin.id,
  };
  const updated: IShoppingMallEscalation =
    await api.functional.shoppingMall.admin.escalations.update(connection, {
      escalationId: escalation.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 9. Validate all fields and updated state
  TestValidator.equals(
    "escalation status is resolved",
    updated.escalation_status,
    "resolved",
  );
  TestValidator.equals(
    "resolution type is refund-issued",
    updated.resolution_type,
    "refund-issued",
  );
  TestValidator.equals(
    "assigned_admin_id is admin",
    updated.assigned_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "resolution comment is set",
    updated.resolution_comment,
    "Refund granted after manual review.",
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    escalation.updated_at,
  );
  TestValidator.equals(
    "order id remains the same",
    updated.shopping_mall_order_id,
    order.id,
  );
}
