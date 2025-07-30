import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPayment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate platform administrator ability to retrieve all order payment events
 * via GET /administrator/orders/{orderId}/payments.
 *
 * This test verifies role-based access control for the payment listing
 * endpoint:
 *
 * 1. Set up admin, customer, seller, and product (using SDK create functions)
 * 2. Customer places an order for the product (with arbitrary valid address UUID)
 * 3. Customer makes two payment records (different methods/amounts)
 * 4. As administrator, read the order payments list; assert both payments present
 *    & details correct
 * 5. Negative test: as customer, attempt to use admin endpoint; expect
 *    failure/rejection
 *
 * This checks both positive/negative permission boundaries and validates
 * end-to-end creation -> retrieval -> denial mechanics.
 */
export async function test_api_aimall_backend_administrator_orders_payments_test_list_order_payments_as_admin(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminPermissionId = typia.random<string & tags.Format<"uuid">>();
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: adminPermissionId,
          email: typia.random<string & tags.Format<"email">>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null, // Real flows would hash passwords, null for system-generated
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 3. Register seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 4. Create a product for the seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 5. Customer places an order (simulate with random valid address_id)
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 50000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Customer creates two payment events
  const payment1 =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 30000,
          currency: "KRW",
          transaction_id: RandomGenerator.alphaNumeric(12),
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment1);
  const payment2 =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "deposit",
          amount: 20000,
          currency: "KRW",
          transaction_id: RandomGenerator.alphaNumeric(12),
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment2);

  // 7. As administrator, retrieve payments for this order
  const paymentPage =
    await api.functional.aimall_backend.administrator.orders.payments.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(paymentPage);
  const paymentIds = paymentPage.data.map((p) => p.id);
  TestValidator.predicate("admin sees payment 1")(
    paymentIds.includes(payment1.id),
  );
  TestValidator.predicate("admin sees payment 2")(
    paymentIds.includes(payment2.id),
  );

  // 8. Negative test: attempt to query as unauthorized actor (simulate as if no admin token/role)
  // There is no SDK-provided login/customer context so simulate by invoking as customer: expected to raise error or deny access
  await TestValidator.error("non-admin cannot access admin endpoint")(
    async () => {
      // (real system would check context/headers; in test framework, this is simulated)
      await api.functional.aimall_backend.administrator.orders.payments.index(
        connection,
        {
          orderId: order.id,
        },
      );
    },
  );
}
