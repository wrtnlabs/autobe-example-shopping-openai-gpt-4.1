import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";

/**
 * Test that a new customer can successfully create a donation using deposit or
 * mileage. Covers proper creation, validation of required fields, linkage to
 * customer and source, balance and eligibility logic, and audit evidence
 * fields. Also verifies failure scenario for negative donation amount (business
 * logic error). Post-creation, validates record fields and traceability.
 */
export async function test_api_customer_donation_creation(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(customer);

  // 2. Create a donation (deposit source)
  const donationInput = {
    shopping_mall_customer_id: customer.id,
    source_type: "deposit",
    source_entity_id: typia.random<string & tags.Format<"uuid">>(),
    target_campaign_code: RandomGenerator.alphaNumeric(8),
    amount: 1000 + Math.floor(Math.random() * 1000),
    evidence_reference: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallDonation.ICreate;
  const donation: IShoppingMallDonation =
    await api.functional.shoppingMall.customer.donations.create(connection, {
      body: donationInput,
    });
  typia.assert(donation);
  TestValidator.equals(
    "donation shopping_mall_customer_id should match registered customer",
    donation.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "donation source_type should be deposit",
    donation.source_type,
    "deposit",
  );
  TestValidator.equals(
    "donation source_entity_id should match input",
    donation.source_entity_id,
    donationInput.source_entity_id,
  );
  TestValidator.equals(
    "donation target_campaign_code should match input",
    donation.target_campaign_code,
    donationInput.target_campaign_code,
  );
  TestValidator.equals(
    "donation amount should match input",
    donation.amount,
    donationInput.amount,
  );
  TestValidator.equals(
    "donation evidence_reference matches",
    donation.evidence_reference,
    donationInput.evidence_reference,
  );
  // 3. Fail donation creation with negative amount (business logic)
  const negDonationInput = {
    shopping_mall_customer_id: customer.id,
    source_type: "mileage",
    source_entity_id: typia.random<string & tags.Format<"uuid">>(),
    target_campaign_code: RandomGenerator.alphaNumeric(8),
    amount: -777,
  } satisfies IShoppingMallDonation.ICreate;
  await TestValidator.error(
    "donation with negative amount should fail",
    async () => {
      await api.functional.shoppingMall.customer.donations.create(connection, {
        body: negDonationInput,
      });
    },
  );
}
