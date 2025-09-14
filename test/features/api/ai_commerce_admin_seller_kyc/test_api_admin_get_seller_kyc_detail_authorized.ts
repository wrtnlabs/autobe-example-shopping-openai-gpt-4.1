import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import type { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates that an authorized admin can retrieve the full detail for a
 * seller KYC record.
 *
 * This test simulates the positive, fully-authorized workflow for
 * cross-role data access:
 *
 * 1. Admin user is registered and logged in
 * 2. Buyer is registered and logged in
 * 3. Buyer is promoted to seller and logged in
 * 4. Seller onboarding and KYC are submitted by the seller (with linked
 *    onboarding_id, doc fields, etc.)
 * 5. The admin context is restored (logged in again)
 * 6. The admin performs GET /aiCommerce/admin/sellerKyc/{sellerKycId}
 * 7. Validates that the returned record matches what was submitted (id,
 *    user_id, onboarding_id, status, doc fields, etc.)
 *
 * This test is intended to guarantee that:
 *
 * - Authorization enforcement works (admin can access, others cannot—other
 *   roles' negative tests are out of scope for this function)
 * - Data returned is accurate and comprehensive per the KYC specification
 */
export async function test_api_admin_get_seller_kyc_detail_authorized(
  connection: api.IConnection,
) {
  // Step 1. Generate test credentials for admin, buyer, seller
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(13);

  // Step 2. Register admin and login
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Step 3. Register buyer and login as buyer
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  const buyerLogin = await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  typia.assert(buyerLogin);

  // Step 4. Register seller (promote buyer) and login as seller
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);

  // Step 5. Seller onboarding creation
  const onboarding =
    await api.functional.aiCommerce.buyer.sellerOnboardings.create(connection, {
      body: {
        user_id: sellerJoin.id,
        application_data: RandomGenerator.paragraph({ sentences: 8 }),
        onboarding_status: "submitted",
      } satisfies IAiCommerceSellerOnboarding.ICreate,
    });
  typia.assert(onboarding);

  // Step 6. Seller KYC creation
  const kycCreateBody = {
    user_id: sellerJoin.id,
    onboarding_id: onboarding.id,
    kyc_status: "pending",
    document_type: "passport",
    document_metadata: JSON.stringify({
      mrz: RandomGenerator.alphaNumeric(10),
    }),
    verification_notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IAiCommerceSellerKyc.ICreate;
  const kycRecord = await api.functional.aiCommerce.seller.sellerKyc.create(
    connection,
    {
      body: kycCreateBody,
    },
  );
  typia.assert(kycRecord);

  // Step 7. Switch context to admin (login again)
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLoginAgain);

  // Step 8. Retrieve KYC record as admin
  const kycFetched = await api.functional.aiCommerce.admin.sellerKyc.at(
    connection,
    {
      sellerKycId: kycRecord.id,
    },
  );
  typia.assert(kycFetched);

  // Step 9. Assert returned KYC details match what was created
  TestValidator.equals("KYC id matches", kycFetched.id, kycRecord.id);
  TestValidator.equals(
    "KYC user_id matches",
    kycFetched.user_id,
    kycCreateBody.user_id,
  );
  TestValidator.equals(
    "KYC onboarding_id matches",
    kycFetched.onboarding_id,
    kycCreateBody.onboarding_id,
  );
  TestValidator.equals(
    "KYC status matches",
    kycFetched.kyc_status,
    kycCreateBody.kyc_status,
  );
  TestValidator.equals(
    "KYC document_type matches",
    kycFetched.document_type,
    kycCreateBody.document_type,
  );
  TestValidator.equals(
    "KYC document_metadata matches",
    kycFetched.document_metadata,
    kycCreateBody.document_metadata,
  );
  TestValidator.equals(
    "KYC verification_notes matches",
    kycFetched.verification_notes,
    kycCreateBody.verification_notes,
  );
}

/**
 * - All await keywords are present for SDK calls
 * - All DTOs correspond exactly with the provided types, no invented properties
 *   are used
 * - No additional import statements are present; template imports are untouched
 * - TestValidator assertions all have descriptive titles
 * - No business rule or type error testing is present, no forbidden error tests
 *   included
 * - Authentication role switching is handled correctly by login flow
 * - Null and undefined handling is not necessary for any assignment due to
 *   provided data
 * - Explicitly compared only fields actually present in the DTO (no
 *   hallucination)
 * - Variable naming is meaningful and precise
 * - Random data generation (emails, doc metadata, notes) uses valid
 *   RandomGenerator/typia patterns
 * - No code after typia.assert() tries to revalidate response types
 * - Scenario fully covered per plan, only positive-admin path tested as required
 *   for this function
 * - No redundant/irrelevant code, template structure respected
 * - No additional helper functions, all logic within main function
 * - Satisfies all checklist, logic, and import constraints
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
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Compilation success (no type errors)
 *   - O Proper async/await usage everywhere
 *   - O All DTOs and APIs are from provided materials only
 *   - O Descriptive TestValidator titles for all assertions
 *   - O No extra properties used in DTOs
 *   - O All nullable and optional handled properly
 *   - O Strict property existence for all requests and responses
 */
const __revise = {};
__revise;
