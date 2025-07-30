import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate that an administrator can update editable metadata fields of a
 * payment transaction (transaction_id, payment_method, paid_at), but cannot
 * alter immutable financial fields (amount, currency) associated with an
 * order's payment.
 *
 * This test covers the full business workflow:
 *
 * 1. Create administrator with sufficient permission
 * 2. Create a seller account
 * 3. Register a customer
 * 4. Place an order linking customer and seller
 * 5. Register a payment for the order
 * 6. Update mutable payment fields as administrator, verify updates
 * 7. Attempt to update immutable fields (amount/currency), ensure rejection or
 *    lack of change (negative scenario)
 */
export async function test_api_aimall_backend_administrator_orders_payments_test_admin_update_payment_transaction_metadata(
  connection: api.IConnection,
) {
  // 1. Create an administrator (privileged for payment update)
  const adminPermissionId = typia.random<string & tags.Format<"uuid">>();
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: adminPermissionId,
          email: `${RandomGenerator.alphabets(8)}@aimall.test`,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Create a seller
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(12),
          email: `${RandomGenerator.alphabets(10)}@seller.aimall.test`,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Register a customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: `${RandomGenerator.alphabets(10)}@customer.aimall.test`,
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Place an order (address_id can be random UUID)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: 100000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 5. Register a payment for the order
  const initialPaidAt = new Date().toISOString();
  const payment: IAimallBackendPayment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 100000,
          currency: "KRW",
          transaction_id: RandomGenerator.alphabets(20),
          paid_at: initialPaidAt,
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment);
  TestValidator.equals("initial amount matches")(payment.amount)(100000);
  TestValidator.equals("initial currency matches")(payment.currency)("KRW");

  // 6. Update mutable payment fields as administrator: transaction_id, payment_method, paid_at
  const updateFields: IAimallBackendPayment.IUpdate = {
    payment_method: "deposit",
    transaction_id: RandomGenerator.alphabets(24),
    paid_at: new Date(Date.now() + 3600_000).toISOString(), // 1 hour after
  };
  const updatedPayment: IAimallBackendPayment =
    await api.functional.aimall_backend.administrator.orders.payments.update(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: updateFields,
      },
    );
  typia.assert(updatedPayment);
  // Changed fields
  TestValidator.equals("updated transaction_id matches")(
    updatedPayment.transaction_id,
  )(updateFields.transaction_id);
  TestValidator.equals("updated payment_method matches")(
    updatedPayment.payment_method,
  )(updateFields.payment_method);
  TestValidator.equals("updated paid_at matches")(updatedPayment.paid_at)(
    updateFields.paid_at,
  );
  // Immutable fields
  TestValidator.equals("amount should not change")(updatedPayment.amount)(
    100000,
  );
  TestValidator.equals("currency should not change")(updatedPayment.currency)(
    "KRW",
  );

  // 7. Negative scenario: attempt update of immutable fields (amount/currency)
  // It is not possible to set forbidden fields (amount, currency) using typed DTO
  // If attempted, TypeScript would fail and compilation would stop. Thus, this is structurally prevented.
  // Instead, validate again that a regular update with legal fields leaves immutable fields unchanged
  const reUpdatedPayment: IAimallBackendPayment =
    await api.functional.aimall_backend.administrator.orders.payments.update(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: {
          payment_method: "credit_card",
          transaction_id: RandomGenerator.alphabets(32),
          paid_at: new Date(Date.now() + 7200_000).toISOString(),
        },
      },
    );
  typia.assert(reUpdatedPayment);
  TestValidator.equals("amount must remain the same")(reUpdatedPayment.amount)(
    100000,
  );
  TestValidator.equals("currency must remain the same")(
    reUpdatedPayment.currency,
  )("KRW");
}
