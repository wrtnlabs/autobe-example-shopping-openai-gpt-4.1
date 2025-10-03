import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";

/**
 * Validate that an admin can update only allowed fields of an existing donation
 * through the admin API.
 *
 * Steps:
 *
 * 1. Register and login as admin
 * 2. Register a customer
 * 3. Customer creates a donation (default state: editable)
 * 4. Admin updates the donation: change status and add evidence and notes
 * 5. Validate mutation in updatable fields and that audit trail (updated_at)
 *    changes; immutable fields remain untouched.
 * 6. Try to update a finalized/locked donation (simulate status update to
 *    'refunded', then try update again) and expect error.
 * 7. Try updating a non-existent donation (random UUID) and expect error.
 */
export async function test_api_admin_donation_update(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd",
      name: RandomGenerator.name(2),
    },
  });
  typia.assert(adminJoin);

  // 2. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      email: customerEmail,
      password: "Custom3rPass!",
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerJoin);

  // 3. Customer creates a donation
  const donationData = {
    shopping_mall_customer_id: customerJoin.id,
    source_type: RandomGenerator.pick(["deposit", "mileage"] as const),
    source_entity_id: typia.random<string & tags.Format<"uuid">>(),
    target_campaign_code: RandomGenerator.alphabets(8),
    amount: 1000,
    evidence_reference: RandomGenerator.alphabets(12),
  } satisfies IShoppingMallDonation.ICreate;

  const donation = await api.functional.shoppingMall.customer.donations.create(
    connection,
    {
      body: donationData,
    },
  );
  typia.assert(donation);

  // Save original immutable values
  const original = {
    donorId: donation.shopping_mall_customer_id,
    sourceType: donation.source_type,
    sourceEntityId: donation.source_entity_id,
    targetCampaignCode: donation.target_campaign_code,
    amount: donation.amount,
    createdAt: donation.created_at,
    donatedAt: donation.donated_at,
  };

  // 4. Admin updates the donation: update status and metadata
  const updateBody = {
    status: "confirmed",
    evidence_reference: RandomGenerator.alphabets(10),
    resolution_message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallDonation.IUpdate;

  const updated = await api.functional.shoppingMall.admin.donations.update(
    connection,
    {
      donationId: donation.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  // 5. Validate updatable vs immutable fields
  TestValidator.equals(
    "donorId immutable",
    updated.shopping_mall_customer_id,
    original.donorId,
  );
  TestValidator.equals(
    "sourceType immutable",
    updated.source_type,
    original.sourceType,
  );
  TestValidator.equals(
    "sourceEntityId immutable",
    updated.source_entity_id,
    original.sourceEntityId,
  );
  TestValidator.equals(
    "targetCampaignCode immutable",
    updated.target_campaign_code,
    original.targetCampaignCode,
  );
  TestValidator.equals("amount immutable", updated.amount, original.amount);
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    donation.updated_at,
  );
  TestValidator.equals("status updated", updated.status, updateBody.status);
  TestValidator.equals(
    "evidence_reference updated",
    updated.evidence_reference,
    updateBody.evidence_reference,
  );
  TestValidator.equals(
    "resolution_message updated",
    (updated as any).resolution_message,
    updateBody.resolution_message,
  );
  // 6. Simulate finalized donation: set status to 'refunded' explicitly, then try another update
  // First finalize the donation
  const finalizeBody = {
    status: "refunded",
  } satisfies IShoppingMallDonation.IUpdate;
  const finalized = await api.functional.shoppingMall.admin.donations.update(
    connection,
    {
      donationId: donation.id,
      body: finalizeBody,
    },
  );
  typia.assert(finalized);
  // Attempt to update again after finalization, should error
  await TestValidator.error("cannot update finalized donation", async () => {
    await api.functional.shoppingMall.admin.donations.update(connection, {
      donationId: donation.id,
      body: {
        status: "confirmed",
      },
    });
  });
  // 7. Attempt to update non-existent donation
  await TestValidator.error("cannot update non-existent donation", async () => {
    await api.functional.shoppingMall.admin.donations.update(connection, {
      donationId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "confirmed",
      },
    });
  });
}
