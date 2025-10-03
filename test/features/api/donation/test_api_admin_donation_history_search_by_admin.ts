import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDonation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDonation";

/**
 * Validates the advanced admin donation search API with filters and pagination.
 *
 * 1. Admin registers (join)
 * 2. Customer registers (join)
 * 3. Customer makes a donation (either deposit or mileage)
 * 4. Admin searches donation history:
 *
 *    - List all donations
 *    - Filter by customer, campaign, status, created_at range, and check pagination
 *    - Confirm created donation is present, retrieved record data matches
 *    - Negative filter (random campaign) returns no records
 */
export async function test_api_admin_donation_history_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Customer registration
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Customer creates a donation
  // Fake up source entity - we can just use a random UUID for test
  const campaignCode = RandomGenerator.alphaNumeric(8);
  const donationAmount = Math.max(100, Math.floor(Math.random() * 1000));
  const sourceType = RandomGenerator.pick(["deposit", "mileage"] as const);
  const sourceEntityId = typia.random<string & tags.Format<"uuid">>();

  // Need to use customer's connection (simulate token switch)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // (In a real app, you'd log in as the customer, but token is already on join.)
  const donationBody = {
    shopping_mall_customer_id: customer.id,
    source_type: sourceType,
    source_entity_id: sourceEntityId,
    target_campaign_code: campaignCode,
    amount: donationAmount,
  } satisfies IShoppingMallDonation.ICreate;
  const donation = await api.functional.shoppingMall.customer.donations.create(
    connection,
    {
      body: donationBody,
    },
  );
  typia.assert(donation);

  // 4. Admin connection (simulate token switch via join)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // Search as admin - list all
  let result = await api.functional.shoppingMall.admin.donations.index(
    connection,
    {
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "admin can see at least one donation",
    result.data.some((d) => d.id === donation.id),
  );
  // Search filter by customer
  const resultByCustomer =
    await api.functional.shoppingMall.admin.donations.index(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        limit: 5,
        page: 1,
      },
    });
  typia.assert(resultByCustomer);
  TestValidator.equals(
    "filtered by customer returns donation",
    resultByCustomer.data.length > 0 ? resultByCustomer.data[0].id : undefined,
    donation.id,
  );
  // Search filter by campaign
  const resultByCampaign =
    await api.functional.shoppingMall.admin.donations.index(connection, {
      body: {
        target_campaign_code: campaignCode,
        limit: 5,
        page: 1,
      },
    });
  typia.assert(resultByCampaign);
  TestValidator.equals(
    "filtered by campaign returns donation",
    resultByCampaign.data.length > 0 ? resultByCampaign.data[0].id : undefined,
    donation.id,
  );
  // Search filter by status (should match the donation's status)
  const resultByStatus =
    await api.functional.shoppingMall.admin.donations.index(connection, {
      body: {
        status: donation.status,
        limit: 5,
        page: 1,
      },
    });
  typia.assert(resultByStatus);
  TestValidator.predicate(
    "filtered by status includes donation",
    resultByStatus.data.some((d) => d.id === donation.id),
  );
  // Search filter by created_at range (should include the donation)
  const now = new Date();
  const before = new Date(
    new Date(donation.created_at).getTime() - 1000,
  ).toISOString();
  const after = new Date(
    new Date(donation.created_at).getTime() + 1000,
  ).toISOString();
  const resultByDate = await api.functional.shoppingMall.admin.donations.index(
    connection,
    {
      body: {
        created_at_from: before,
        created_at_to: after,
        limit: 5,
        page: 1,
      },
    },
  );
  typia.assert(resultByDate);
  TestValidator.predicate(
    "filtered by created_at includes donation",
    resultByDate.data.some((d) => d.id === donation.id),
  );
  // Search with impossible filter (random campaign that doesn't exist)
  const resultNoMatch = await api.functional.shoppingMall.admin.donations.index(
    connection,
    {
      body: {
        target_campaign_code: RandomGenerator.alphaNumeric(12),
        limit: 5,
        page: 1,
      },
    },
  );
  typia.assert(resultNoMatch);
  TestValidator.equals(
    "impossible filter yields zero records",
    resultNoMatch.data.length,
    0,
  );
  // Validate pagination consistency
  TestValidator.predicate(
    "pagination meta matches number of records",
    result.pagination.records >= result.data.length &&
      result.pagination.limit === 10,
  );
}
