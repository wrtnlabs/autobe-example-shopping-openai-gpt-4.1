import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that attempting to delete a non-existent seller returns a not found
 * error.
 *
 * Business context: Only administrators can delete a seller by sellerId. Hard
 * deletion removes the seller's account entirely from the system, with no
 * soft-delete. System integrity must be preserved and errors must be logged for
 * audit purposes. This test verifies that the system responds appropriately
 * when the sellerId does not exist.
 *
 * Test Steps:
 *
 * 1. Generate a random UUID that does not correspond to any seller in the system
 *    (we do NOT create this user, so this value is ensured not to exist).
 * 2. Attempt to delete the seller using the administrator delete API for that
 *    sellerId.
 * 3. Expect the API to respond with a not found error.
 * 4. Verify that an appropriate error is thrown and the business workflow does not
 *    soft-delete or succeed.
 */
export async function test_api_aimall_backend_administrator_sellers_test_delete_nonexistent_seller_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID guaranteed not to exist
  const nonexistentSellerId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete seller and 3. Expect not found error
  await TestValidator.error(
    "delete non-existent seller returns not found error",
  )(async () => {
    // This should throw a HttpError (likely 404)
    await api.functional.aimall_backend.administrator.sellers.erase(
      connection,
      { sellerId: nonexistentSellerId },
    );
  });
}
