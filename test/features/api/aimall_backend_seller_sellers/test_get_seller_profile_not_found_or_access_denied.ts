import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * E2E test for negative and access control scenarios on seller profile
 * retrieval.
 *
 * Validates:
 *
 * - 404 Not Found when looking up a non-existent seller
 * - That regular access using real sellerId returns proper records
 * - Note: Role-based access (403) cannot be tested here, as there is no seller
 *   login/auth API.
 *
 * Steps:
 *
 * 1. Create two unique sellers using the administrator endpoint.
 * 2. Try fetching a random (non-existent) sellerId; assert a 404 error.
 * 3. Optionally, verify each seller profile can be found by its id as a positive
 *    check.
 */
export async function test_api_aimall_backend_seller_sellers_test_get_seller_profile_not_found_or_access_denied(
  connection: api.IConnection,
) {
  // 1. Create two seller accounts as admin
  const seller1 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller1);

  const seller2 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller2);

  // 2. Try to fetch a non-existent sellerId (random UUID)
  TestValidator.error("404 expected for non-existent seller")(() =>
    api.functional.aimall_backend.seller.sellers.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 3. Optionally, verify each seller profile can be found by its id
  const read1 = await api.functional.aimall_backend.seller.sellers.at(
    connection,
    { sellerId: seller1.id },
  );
  typia.assert(read1);
  TestValidator.equals("match seller1")(read1.id)(seller1.id);

  const read2 = await api.functional.aimall_backend.seller.sellers.at(
    connection,
    { sellerId: seller2.id },
  );
  typia.assert(read2);
  TestValidator.equals("match seller2")(read2.id)(seller2.id);
}
