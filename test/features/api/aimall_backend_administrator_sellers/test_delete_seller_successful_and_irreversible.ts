import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * E2E test for hard deleting a seller account by admin
 *
 * This test ensures that an administrator can irreversibly remove a seller's
 * account via sellerId. It covers creation, deletion, and post-deletion
 * verification to confirm true removal (no soft-delete mechanism).
 *
 * Process:
 *
 * 1. Register a new seller via API (admin context)
 * 2. Confirm seller exists by fetching it
 * 3. Delete the seller via the erase endpoint (admin context)
 * 4. Attempt to fetch the seller again; ensure a not-found error is thrown
 *    (deleted irreversibly)
 */
export async function test_api_aimall_backend_administrator_sellers_test_delete_seller_successful_and_irreversible(
  connection: api.IConnection,
) {
  // 1. Create a new seller (to be deleted)
  const sellerCreateInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.paragraph()(1).slice(0, 32),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone:
      "010" +
      String(
        typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<10000000> &
            tags.Maximum<99999999>
        >(),
      ),
    status: "pending",
  };

  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerCreateInput },
    );
  typia.assert(seller);

  // 2. Confirm seller exists (should succeed)
  const fetched = await api.functional.aimall_backend.administrator.sellers.at(
    connection,
    { sellerId: seller.id },
  );
  typia.assert(fetched);
  TestValidator.equals("created seller record matches fetched record")(
    fetched.id,
  )(seller.id);

  // 3. Delete the seller as admin
  await api.functional.aimall_backend.administrator.sellers.erase(connection, {
    sellerId: seller.id,
  });

  // 4. Attempt to fetch after deletion (should throw not-found error)
  await TestValidator.error("seller not found after hard delete")(async () => {
    await api.functional.aimall_backend.administrator.sellers.at(connection, {
      sellerId: seller.id,
    });
  });
}
