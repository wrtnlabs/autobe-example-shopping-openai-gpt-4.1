import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";

/**
 * Test soft deletion (logical removal) of a donation before settlement by an
 * admin.
 *
 * This test covers the workflow in which an admin soft deletes a donation that
 * was just created and not finalized/settled. The goal is to ensure business
 * logic compliance on irreversible removes and proper evidence tracking.
 *
 * Steps:
 *
 * 1. Register a new customer and login.
 * 2. Create a donation for the customer using either a deposit or mileage account
 *    (simulate with valid tags/values).
 * 3. Register and login as a new admin user for admin privileges.
 * 4. As admin, invoke the DELETE endpoint for the donation (soft delete).
 * 5. Confirm the donation's deleted_at field is now non-null, meaning it's
 *    logically deleted but still physically present for
 *    audit/compliance/tracing.
 * 6. Assert the donation is not returned by default queries for active/non-deleted
 *    donations. (Would require index/list API with filtering in real system.)
 * 7. (Descriptive only) Confirm audit logs exist for the delete event. (Full
 *    validation omitted unless API exposes this.)
 */
export async function test_api_admin_donation_soft_delete_before_settlement(
  connection: api.IConnection,
) {
  // 1. Register and login as customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: null,
    },
  });
  typia.assert(customer);

  // 2. Create a valid donation as the customer
  // Simulate deposit source for simplicity (source_type: 'deposit')
  const donationSourceEntityId = typia.random<string & tags.Format<"uuid">>();
  const donationTargetCampaignCode = RandomGenerator.alphaNumeric(8);
  const donationAmount = 100;
  const donationCreate = {
    shopping_mall_customer_id: customer.id,
    source_type: "deposit",
    source_entity_id: donationSourceEntityId,
    target_campaign_code: donationTargetCampaignCode,
    amount: donationAmount,
  } satisfies IShoppingMallDonation.ICreate;

  const donation = await api.functional.shoppingMall.customer.donations.create(
    connection,
    {
      body: donationCreate,
    },
  );
  typia.assert(donation);
  TestValidator.equals(
    "donation deleted_at (should be undefined initially)",
    donation.deleted_at,
    undefined,
  );

  // 3. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });
  typia.assert(admin);

  // 4. As admin, soft delete the donation
  await api.functional.shoppingMall.admin.donations.erase(connection, {
    donationId: donation.id,
  });

  // 5. (Hypothetical) Fetch the donation again to check logical deletion
  // There is no direct API for fetching a donation by ID in the admin or customer context,
  // so full physical presence verification is not possible here.
  // In a full implementation, this would be replaced by an index/list/or get API with deleted_at included.
  // Here, we just note what would be checked.

  // TestValidator.predicate(
  //   "donation should not appear in standard list (skipped due to missing index API)",
  //   ...
  // );
  // TestValidator.predicate(
  //   "donation should have non-null deleted_at in database (skipped, no API)",
  //   ...
  // );

  // 6. (Descriptive only) Confirm audit logs/snapshots exist for the deletion event
  // (Omitted due to API limitations)
}
