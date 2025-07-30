import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Tests that a logged-in customer can only see their own coupon list, with
 * strict isolation from other customers' data.
 *
 * Business workflow:
 *
 * 1. Create a test customer account in the system.
 * 2. Issue a coupon associated with that customer using the administrator coupon
 *    issuance API.
 * 3. Create a different unrelated customer and issue another coupon to them
 *    (should not appear in the test user's results).
 * 4. Retrieve the coupon list as the test customer (assuming connection is in
 *    correct "customer" context).
 * 5. Assert that all returned coupons have customer_id matching the test customer;
 *    that no coupon associated to the other customer is present; and all coupon
 *    data matches the schema.
 * 6. Optionally, verify that pagination structure is valid and reasonable.
 */
export async function test_api_aimall_backend_test_list_customer_coupons_success(
  connection: api.IConnection,
) {
  // 1. Create the test customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Issue a coupon to the test customer
  const campaignId = typia.random<string & tags.Format<"uuid">>();
  const couponCode = RandomGenerator.alphaNumeric(10);
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 1 week from now
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId,
          customer_id: customer.id,
          code: couponCode,
          status: "issued",
          issued_at: issuedAt,
          expires_at: expiresAt,
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Issue a coupon to another, unrelated customer
  const otherCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(otherCustomer);
  const otherCoupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
          customer_id: otherCustomer.id,
          code: RandomGenerator.alphaNumeric(10),
          status: "issued",
          issued_at: issuedAt,
          expires_at: expiresAt,
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(otherCoupon);

  // 4. Retrieve coupons as the test customer (assuming authenticated customer context)
  const result =
    await api.functional.aimall_backend.customer.coupons.index(connection);
  typia.assert(result);

  // 5. Assert each coupon belongs to this customer and is not another's
  if (result.data) {
    for (const c of result.data) {
      typia.assert<IAimallBackendCoupon>(c);
      TestValidator.equals("customer_id is self")(c.customer_id)(customer.id);
      TestValidator.notEquals("not other customer's coupon")(c.id)(
        otherCoupon.id,
      );
    }
    TestValidator.predicate("no coupon from other customer visible")(
      !result.data.some((c) => c.id === otherCoupon.id),
    );
    TestValidator.predicate("at least one coupon present")(
      result.data.length >= 1,
    );
  } else {
    throw new Error("Expected at least one coupon in result");
  }

  // 6. (Optional) Validate pagination structure if present
  if (result.pagination) {
    typia.assert(result.pagination);
    TestValidator.predicate("pagination limit covers count")(
      (result.pagination.limit ?? 0) >= result.data.length,
    );
  }
}
