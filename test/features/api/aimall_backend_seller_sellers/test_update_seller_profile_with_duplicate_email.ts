import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Test that updating a seller's email to a value already used by another seller
 * fails due to a uniqueness constraint.
 *
 * Business scenario: Sellers must have unique emails. Attempting to change a
 * seller's email to an existing seller's email is an error.
 *
 * Process:
 *
 * 1. Create the first seller (seller1) with unique email A.
 * 2. Create the second seller (seller2) with unique email B.
 * 3. Try to update seller2, changing the email to A (already used by seller1).
 * 4. Confirm that the update fails with a uniqueness constraint violation (e.g.,
 *    error/exception is thrown).
 */
export async function test_api_aimall_backend_seller_sellers_test_update_seller_profile_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Create the first seller
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: seller1Email,
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller1);

  // 2. Create the second seller
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: seller2Email,
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller2);

  // 3. Attempt to update seller2's email to seller1's email (expect error)
  await TestValidator.error("Should fail when updating to duplicate email")(
    async () => {
      await api.functional.aimall_backend.seller.sellers.update(connection, {
        sellerId: seller2.id,
        body: {
          business_name: seller2.business_name,
          email: seller1Email, // duplicate email
          contact_phone: seller2.contact_phone,
          status: seller2.status,
          updated_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IAimallBackendSeller.IUpdate,
      });
    },
  );
}
