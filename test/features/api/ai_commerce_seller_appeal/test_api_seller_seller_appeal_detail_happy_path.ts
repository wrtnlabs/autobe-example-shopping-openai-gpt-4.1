import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that an authenticated seller can successfully retrieve details of an
 * appeal they have submitted.
 *
 * This test covers the complete happy path for seller appeal detail retrieval:
 *
 * 1. Seller registration and authentication
 * 2. Seller profile creation
 * 3. Seller appeal submission
 * 4. Seller retrieves appeal detail
 *
 * The test asserts that:
 *
 * - All prerequisite entities are created successfully.
 * - The appeal detail endpoint returns the expected data for the submitting
 *   seller.
 * - Sensitive/business-relevant fields match the originally submitted data.
 * - Access control is respected (checked via field equality only in this happy
 *   path).
 */
export async function test_api_seller_seller_appeal_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Create seller profile (requires seller authentication)
  const displayName = RandomGenerator.name();
  const approvalStatus = "pending";
  const profileMetadata = JSON.stringify({ note: RandomGenerator.paragraph() });
  const profileCreate =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerJoin.id,
        display_name: displayName,
        profile_metadata: profileMetadata,
        approval_status: approvalStatus,
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(profileCreate);

  // 3. Submit a seller appeal
  const appealType = "penalty";
  const appealData = JSON.stringify({
    evidence: RandomGenerator.paragraph({ sentences: 3 }),
  });
  const status = "open";
  const appealCreate =
    await api.functional.aiCommerce.seller.sellerAppeals.create(connection, {
      body: {
        seller_profile_id: profileCreate.id,
        appeal_type: appealType,
        appeal_data: appealData,
        status,
      } satisfies IAiCommerceSellerAppeal.ICreate,
    });
  typia.assert(appealCreate);

  // 4. Retrieve the appeal detail by its id
  const appealDetail = await api.functional.aiCommerce.seller.sellerAppeals.at(
    connection,
    {
      sellerAppealId: appealCreate.id,
    },
  );
  typia.assert(appealDetail);

  // Assert that the returned appeal detail matches what was submitted
  TestValidator.equals("Appeal id matches", appealDetail.id, appealCreate.id);
  TestValidator.equals(
    "Seller profile id matches",
    appealDetail.seller_profile_id,
    profileCreate.id,
  );
  TestValidator.equals(
    "Appeal type matches",
    appealDetail.appeal_type,
    appealType,
  );
  TestValidator.equals(
    "Appeal data matches",
    appealDetail.appeal_data,
    appealData,
  );
  TestValidator.equals("Appeal status matches", appealDetail.status, status);
}

/**
 * - Code correctly implements seller creation, profile creation, appeal creation,
 *   and retrieval.
 * - All required fields for each DTO are present, with type safety enforced via
 *   satisfies for request bodies and typia.assert on responses.
 * - Random test data generated using RandomGenerator and typia.random with proper
 *   constraints.
 * - Authentication and resource creation steps follow business logic.
 * - All TestValidator assertions have proper descriptive titles.
 * - Only one connection is used (no role/context mix or header manipulation).
 * - No illogical code, compilation errors, or use of forbidden patterns such as
 *   'as any' or missing required fields.
 * - No additional import statements or template changes; only template code
 *   section is modified.
 * - No testing of type validation (all data is correct type).
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O No compilation errors
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O Function follows correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O All TestValidator functions include descriptive title as first parameter
 */
const __revise = {};
__revise;
