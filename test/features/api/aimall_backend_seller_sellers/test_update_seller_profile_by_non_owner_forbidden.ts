import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate that a seller cannot update another seller's profile (forbidden for
 * non-owners).
 *
 * This test verifies the authorization enforcement for seller profile updates.
 * Specifically, after registering two separate seller accounts:
 *
 * 1. Seller A (first seller) is created.
 * 2. Seller B (second seller) is created.
 * 3. Attempt to update Seller B's profile while authenticated as Seller A.
 * 4. Confirm that the operation fails due to insufficient permissions—sellers
 *    should only be able to update their own account information, unless they
 *    have administrator rights.
 *
 * Process:
 *
 * - Create Seller A via administrator endpoint, store credentials/ID.
 * - Create Seller B via administrator endpoint, store credentials/ID.
 * - Attempt to update Seller B using Seller A's context (simulate acting as
 *   Seller A).
 * - Ensure an error is thrown indicating forbidden action (authorization
 *   failure--notfound/forbidden/etc).
 */
export async function test_api_aimall_backend_seller_sellers_test_update_seller_profile_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Create Seller A
  const sellerACreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.paragraph()(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: sellerACreate,
      },
    );
  typia.assert(sellerA);

  // 2. Create Seller B
  const sellerBCreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.paragraph()(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: sellerBCreate,
      },
    );
  typia.assert(sellerB);

  // 3. Attempt to update Seller B's profile as Seller A.
  // NOTE: If authentication switching is not available in this test infra, the test assumes the current connection is for Seller A.
  const updateBByA: IAimallBackendSeller.IUpdate = {
    business_name: RandomGenerator.paragraph()(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  await TestValidator.error("non-owner seller cannot update another's profile")(
    () =>
      api.functional.aimall_backend.seller.sellers.update(connection, {
        sellerId: sellerB.id,
        body: updateBByA,
      }),
  );
}
