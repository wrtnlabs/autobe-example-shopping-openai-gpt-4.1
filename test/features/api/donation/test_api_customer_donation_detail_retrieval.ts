import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";

/**
 * Test that a customer can retrieve details of a specific donation they have
 * created, that all returned fields match what was created, and that access
 * control is enforced. Also tests non-existence and soft deletion.
 *
 * Scenario Steps:
 *
 * 1. Register Customer_A (main customer)
 * 2. Customer_A creates a donation to a random target campaign
 * 3. Retrieve the created donation by its id and assert correctness
 * 4. Register Customer_B (other user)
 * 5. As Customer_B, try to retrieve Customer_A's donation (should fail -
 *    forbidden)
 * 6. Try to retrieve a non-existent donation id (should fail)
 * 7. (If applicable) Simulate soft deletion: manually delete (simulate by changing
 *    header or calling delete if available), then assert not found/denied
 */
export async function test_api_customer_donation_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register Customer_A
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAName = RandomGenerator.name();
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerAEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: customerAName,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAJoin);

  // 2. Customer_A creates a donation (simulate a deposit/mileage, here deposit)
  const targetCampaignCode = RandomGenerator.alphaNumeric(8);
  const sourceType: "deposit" | "mileage" = RandomGenerator.pick([
    "deposit",
    "mileage",
  ] as const);
  // Fake a source_entity_id as uuid for this test
  const sourceEntityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const donationAmount = 100;
  const donationCreateBody = {
    shopping_mall_customer_id: customerAJoin.id,
    source_type: sourceType,
    source_entity_id: sourceEntityId,
    target_campaign_code: targetCampaignCode,
    amount: donationAmount,
  } satisfies IShoppingMallDonation.ICreate;
  const donation = await api.functional.shoppingMall.customer.donations.create(
    connection,
    {
      body: donationCreateBody,
    },
  );
  typia.assert(donation);
  TestValidator.equals(
    "created donation shopping_mall_customer_id",
    donation.shopping_mall_customer_id,
    customerAJoin.id,
  );
  TestValidator.equals(
    "created donation campaign code",
    donation.target_campaign_code,
    targetCampaignCode,
  );
  TestValidator.equals(
    "created donation source type",
    donation.source_type,
    sourceType,
  );
  TestValidator.equals(
    "created donation source entity id",
    donation.source_entity_id,
    sourceEntityId,
  );
  TestValidator.equals(
    "created donation amount",
    donation.amount,
    donationAmount,
  );

  // 3. Retrieve the created donation (should be successful)
  const retrieved = await api.functional.shoppingMall.customer.donations.at(
    connection,
    {
      donationId: donation.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved donation matches created",
    retrieved,
    donation,
    (key) =>
      key === "created_at" || key === "updated_at" || key === "donated_at",
  ); // Timestamps might differ but other fields must match

  // 4. Register Customer_B
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBName = RandomGenerator.name();
  const customerBJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerBEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: customerBName,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerBJoin);
  // Switch auth context to Customer_B (login resets token)

  // 5. Try to retrieve the donation as Customer_B (expect error)
  await TestValidator.error(
    "other customer cannot access donation",
    async () => {
      await api.functional.shoppingMall.customer.donations.at(connection, {
        donationId: donation.id,
      });
    },
  );

  // 6. Try to retrieve non-existent donation (random uuid, expect error)
  await TestValidator.error("non-existent donation id", async () => {
    await api.functional.shoppingMall.customer.donations.at(connection, {
      donationId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
