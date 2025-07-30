import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";
import type { IPageIAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPayment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search and filtering of payments for an order as an
 * administrator.
 *
 * This function verifies:
 *
 * - That payments can be filtered by method, amount range, period, currency, and
 *   transaction ID
 * - That paging and no-result/edge/error conditions are handled as expected
 *
 * Steps:
 *
 * 1. Create an administrator (with given admin role UUID)
 * 2. Register a customer
 * 3. Register a seller
 * 4. Create a product (using admin), tied to the seller
 * 5. Customer places an order for the product
 * 6. Multiple payments are added to the order (varying
 *    methods/amounts/times/currency)
 * 7. Perform filtered searches: by method, date range, amount, paging
 * 8. Validate results match expectations
 * 9. Edge case: query for nonexistent matches
 * 10. Error case: invalid filter (e.g., negative amount range) triggers validation
 *     error
 */
export async function test_api_administrator_test_search_order_payments_with_advanced_filtering_as_admin(
  connection: api.IConnection,
) {
  // 1. Create an administrator with arbitrary permission_id
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register a customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        // password_hash omitted (nullable & optional)
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Register a seller
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 4. Create a product (admin privilege)
  // Category: create dummy UUID, as real catalog is external to this suite
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(2),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(6)}/360/360`,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 5. Place an order as customer (needs address, simulate with dummy UUID)
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id,
        // Optionally assign custom order_number, else auto
        order_status: "pending",
        total_amount: 30000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 6. Register multiple payments (partial, diff method/time/currency)
  // [A] credit_card in KRW (15000), [B] deposit in KRW (10000), [C] coupon in KRW (5000), [D] points in USD (pt-like, for edge)
  const paymentA =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 15000,
          currency: "KRW",
          transaction_id: `CC${RandomGenerator.alphaNumeric(8)}`,
          paid_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(paymentA);
  const paymentB =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "deposit",
          amount: 10000,
          currency: "KRW",
          transaction_id: `DP${RandomGenerator.alphaNumeric(8)}`,
          paid_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(paymentB);
  const paymentC =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "coupon",
          amount: 5000,
          currency: "KRW",
          transaction_id: `CP${RandomGenerator.alphaNumeric(6)}`,
          paid_at: new Date(Date.now()).toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(paymentC);
  const paymentD =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "points",
          amount: 7000,
          currency: "USD",
          transaction_id: `PT${RandomGenerator.alphaNumeric(7)}`,
          paid_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(paymentD);

  // 7. Filter: payment_method="credit_card" (should find A)
  {
    const res =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            payment_method: "credit_card",
          },
        },
      );
    typia.assert(res);
    TestValidator.predicate("method=credit_card only")(
      res.data.length === 1 && res.data[0].id === paymentA.id,
    );
  }
  // 8. Filter: currency="KRW", amount range [10001,20000] (should find just A)
  {
    const res =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            currency: "KRW",
            amount_min: 10001,
            amount_max: 20000,
          },
        },
      );
    typia.assert(res);
    TestValidator.equals("find only paymentA KRW/amt range")(
      res.data.map((p) => p.id),
    )([paymentA.id]);
  }
  // 9. Filter: paid_from ~ paid_to between paymentB and paymentC (should find B, C, D if overlapping)
  {
    const paid_from = new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString();
    const paid_to = new Date(Date.now()).toISOString();
    const res =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            paid_from,
            paid_to,
          },
        },
      );
    typia.assert(res);
    // paymentB, C, D within window
    const foundIds = res.data.map((p) => p.id);
    TestValidator.predicate("date range matches B/C/D")(
      [paymentB.id, paymentC.id, paymentD.id].every((id) =>
        foundIds.includes(id),
      ),
    );
  }
  // 10. Filter: transaction_id
  {
    const res =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            transaction_id: paymentB.transaction_id!,
          },
        },
      );
    typia.assert(res);
    TestValidator.equals("txn id unique matches B")(res.data.length)(1);
    TestValidator.equals("match txid=B")(res.data[0].id)(paymentB.id);
  }
  // 11. Paging: limit 2, page 1 (should get 2), page 2 (should get <=2)
  {
    const res1 =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            page: 1,
            limit: 2,
          },
        },
      );
    typia.assert(res1);
    TestValidator.equals("page 1 = 2 results")(res1.data.length)(2);
    const res2 =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            page: 2,
            limit: 2,
          },
        },
      );
    typia.assert(res2);
    TestValidator.predicate("page 2 <= 2 results")(res2.data.length <= 2);
    TestValidator.notEquals("page 1 != page 2data")(res1.data.map((p) => p.id))(
      res2.data.map((p) => p.id),
    );
  }
  // 12. Edge: non-matching method (fake)
  {
    const res =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            payment_method: "nonexistent_method_code",
          },
        },
      );
    typia.assert(res);
    TestValidator.equals("no results for fake method")(res.data.length)(0);
  }
  // 13. Edge: amount min too high
  {
    const res =
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            amount_min: 10000000,
          },
        },
      );
    typia.assert(res);
    TestValidator.equals("no results for hi amt")(res.data.length)(0);
  }
  // 14. Error: negative min
  {
    await TestValidator.error("negative amount yields error")(async () => {
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            amount_min: -1,
          },
        },
      );
    });
  }
  // 15. Error: paid_from > paid_to
  {
    const paid_from = new Date(Date.now()).toISOString();
    const paid_to = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    await TestValidator.error("from > to yields error")(async () => {
      await api.functional.aimall_backend.administrator.orders.payments.search(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            paid_from,
            paid_to,
          },
        },
      );
    });
  }
}
