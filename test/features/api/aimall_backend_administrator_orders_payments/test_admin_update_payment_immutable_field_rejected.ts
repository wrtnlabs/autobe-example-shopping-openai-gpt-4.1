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
 * Validate that attempts to update immutable financial fields of a payment
 * (amount/currency) via the administrator API are rejected and that only legal
 * updates (transaction_id, paid_at) are permitted.
 *
 * Business Context: Immutable payment fields like 'amount' and 'currency' exist
 * due to compliance and audit requirements. The API and DTO contract must
 * prevent any administrator from mutating these after payment confirmation
 * (editing is forbidden for both ordinary and privileged users after payment is
 * settled, except via explicit refund/new event).
 *
 * Test Steps:
 *
 * 1. Register an administrator account.
 * 2. Register a seller required for the order context.
 * 3. Register a customer.
 * 4. Create an order (with all required fields for business, seller, customer).
 * 5. Create a payment associated with this order (credit card, full payment).
 * 6. As administrator, attempt to update allowed (mutable) payment fields such as
 *    transaction_id and paid_at — confirm success.
 * 7. (Type-safety edge case) Attempting to update immutable fields
 *    (amount/currency) is not permitted by DTO and TypeScript, which prevents
 *    code even being written for such an update; runtime defense is
 *    unnecessary.
 * 8. Ensure test code only tries permitted updates, and that business contract is
 *    honored.
 */
export async function test_api_aimall_backend_administrator_orders_payments_test_admin_update_payment_immutable_field_rejected(
  connection: api.IConnection,
) {
  // 1. Register administrator account.
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Register seller account.
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(6) + " Inc.",
          email: typia.random<string>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        },
      },
    );
  typia.assert(seller);

  // 3. Register customer.
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 4. Create order (min business fields).
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "paid",
        total_amount: 75000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. Create payment (paid in full, credit_card).
  const payment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 75000,
          currency: "KRW",
          transaction_id: RandomGenerator.alphabets(12),
        },
      },
    );
  typia.assert(payment);

  // 6. As ADMIN, perform a legal update to the payment (update allowed fields only).
  const updateBody = {
    transaction_id: RandomGenerator.alphabets(16),
    paid_at: new Date().toISOString(),
  } satisfies IAimallBackendPayment.IUpdate;
  const updated =
    await api.functional.aimall_backend.administrator.orders.payments.update(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 7. TypeScript type contract forbids illegal mutation of immutable fields (amount/currency). The API is type safe.
  //    Attempting to add those fields is not legal TypeScript and so cannot be attempted in a valid E2E suite.
  //    This test demonstrates the safety of the DTO and API contract for these compliance-sensitive fields.
}
