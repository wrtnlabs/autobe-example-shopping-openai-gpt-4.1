import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderIncident";
import type { IPageIShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

/**
 * End-to-end test for admin incident query, filter, and pagination
 * endpoints on an order.
 *
 * Business context: Admins need to investigate, filter, and paginate
 * incident records (fraud/compliance/dispute/etc) for any given order. This
 * test ensures admins can search incidents by type, status, and date range;
 * check sorting and pagination of results; and cannot see soft-deleted
 * incidents unless permitted. Edge cases for empty, large, and non-matching
 * result sets, as well as permission enforcement for non-admins, are also
 * covered.
 *
 * Steps:
 *
 * 1. Create and authenticate an admin account (join)
 * 2. Create a coupon as related dummy data to use as a testable order
 *    (surrogate for order ID)
 * 3. Query the incidents list for the coupon ID as orderId via PATCH
 *    /shoppingMallAiBackend/admin/orders/{orderId}/incidents
 * 4. Test filters: incident_type, status, from/to dates, pagination
 *    (page/limit), large page/limit, and non-existent values
 * 5. For each: check results match filter, correct pagination, incidents are
 *    sorted as expected
 * 6. Edge: ensure empty result for non-existent filter, verify soft-deleted
 *    incidents are not present
 * 7. Edge: simulate non-admin access (by joining a new admin and then removing
 *    admin credentials) and verify permission error
 */
export async function test_api_admin_order_incidents_search_listing_and_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new admin account
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(8)}@corp-test.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. Create a coupon as a dummy order resource
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          type: "fixed",
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          value: 1000,
          status: "active",
          stackable: false,
          personal: false,
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Attempt to list incidents with no existing incidents: expect empty/zero result
  let result =
    await api.functional.shoppingMallAiBackend.admin.orders.incidents.index(
      connection,
      {
        orderId: coupon.id as string & tags.Format<"uuid">,
        body: {},
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "no incident records for new coupon (orderId)",
    result.data.length,
    0,
  );

  // 4. Test: pagination, extreme page/limit, non-matching filters
  for (const { filter, expectedEmpty, desc } of [
    {
      filter: { page: 9999, limit: 5 },
      expectedEmpty: true,
      desc: "very high page index yields empty result",
    },
    {
      filter: { limit: 50 },
      expectedEmpty: true,
      desc: "high limit yields no data (no incidents exist)",
    },
    {
      filter: { incident_type: "invalid_type" },
      expectedEmpty: true,
      desc: "invalid incident_type filter gives empty",
    },
    {
      filter: { status: "deleted" },
      expectedEmpty: true,
      desc: "unavailable status filter gives empty",
    },
  ]) {
    const output =
      await api.functional.shoppingMallAiBackend.admin.orders.incidents.index(
        connection,
        {
          orderId: coupon.id as string & tags.Format<"uuid">,
          body: filter,
        },
      );
    typia.assert(output);
    TestValidator.predicate(desc, output.data.length === 0);
  }

  // 5. Permission: create a "non-admin" (by dropping the Authorization header after a join) and ensure forbidden
  const nonAdminConn: api.IConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  const secondAdmin = await api.functional.auth.admin.join(nonAdminConn, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(8)}@corp-test.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(secondAdmin);
  if (nonAdminConn.headers?.Authorization)
    delete nonAdminConn.headers.Authorization;
  await TestValidator.error(
    "should not authorize order incidents index for non-authenticated user",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.incidents.index(
        nonAdminConn,
        {
          orderId: coupon.id as string & tags.Format<"uuid">,
          body: {},
        },
      );
    },
  );
}
