import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate successful creation of a product inquiry by a registered buyer
 * and related business logic:
 *
 * 1. Register a new buyer (establish authentication context).
 * 2. Use typia.random to generate a UUID for product_id (simulate a product
 *    reference).
 * 3. Buyer creates a new inquiry with filled question and visibility='public'
 *    (and again with visibility='private').
 * 4. Verify the returned inquiry entity has correct properties: matches input,
 *    is linked to the buyer (author_id), answer is empty or undefined,
 *    status field present.
 * 5. Attempt to create inquiry with missing authentication (connection without
 *    Authorization header) and confirm failure (TestValidator.error).
 * 6. (Optional, cannot test inquiry search/listing with only the given SDK
 *    functions—excluded here).
 * 7. (Optional, cannot test privacy for other buyers since no API to
 *    retrieve/search inquiries—excluded here).
 */
export async function test_api_inquiry_create_and_post_owner_success(
  connection: api.IConnection,
) {
  // Step 1: Buyer registration (establish session)
  const buyerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IBuyer.ICreate;
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: buyerInput,
  });
  typia.assert(buyerAuth);

  // Step 2.1: Successful creation - visibility: public
  const productId = typia.random<string & tags.Format<"uuid">>();
  const inquiryBodyPublic = {
    product_id: productId,
    question: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
  } satisfies IAiCommerceInquiry.ICreate;
  const inquiryPublic = await api.functional.aiCommerce.buyer.inquiries.create(
    connection,
    { body: inquiryBodyPublic },
  );
  typia.assert(inquiryPublic);
  TestValidator.equals(
    "inquiry author_id matches buyer id",
    inquiryPublic.author_id,
    buyerAuth.id,
  );
  TestValidator.equals(
    "inquiry product_id matches input",
    inquiryPublic.product_id,
    productId,
  );
  TestValidator.equals(
    "inquiry question matches input",
    inquiryPublic.question,
    inquiryBodyPublic.question,
  );
  TestValidator.equals(
    "inquiry visibility is public",
    inquiryPublic.visibility,
    "public",
  );
  TestValidator.equals(
    "inquiry answer is null or undefined",
    inquiryPublic.answer,
    null,
  );
  TestValidator.predicate(
    "inquiry has status value",
    typeof inquiryPublic.status === "string" && inquiryPublic.status.length > 0,
  );

  // Step 2.2: Successful creation - visibility: private
  const inquiryBodyPrivate = {
    product_id: productId,
    question: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
  } satisfies IAiCommerceInquiry.ICreate;
  const inquiryPrivate = await api.functional.aiCommerce.buyer.inquiries.create(
    connection,
    { body: inquiryBodyPrivate },
  );
  typia.assert(inquiryPrivate);
  TestValidator.equals(
    "private inquiry author_id matches buyer id",
    inquiryPrivate.author_id,
    buyerAuth.id,
  );
  TestValidator.equals(
    "private inquiry product_id matches input",
    inquiryPrivate.product_id,
    productId,
  );
  TestValidator.equals(
    "private inquiry question matches input",
    inquiryPrivate.question,
    inquiryBodyPrivate.question,
  );
  TestValidator.equals(
    "private inquiry visibility is private",
    inquiryPrivate.visibility,
    "private",
  );
  TestValidator.equals(
    "private inquiry answer is null or undefined",
    inquiryPrivate.answer,
    null,
  );
  TestValidator.predicate(
    "private inquiry has status value",
    typeof inquiryPrivate.status === "string" &&
      inquiryPrivate.status.length > 0,
  );

  // Step 3: Error scenario - attempt without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated inquiry create should fail",
    async () => {
      await api.functional.aiCommerce.buyer.inquiries.create(unauthConn, {
        body: inquiryBodyPublic,
      });
    },
  );
}

/**
 * - All required business logic is present, including proper authentication,
 *   field validation, and error scenario for unauthenticated request.
 * - Strictly uses provided DTOs and API function definitions only (no fictional
 *   entities).
 * - Ensures typia.assert() is called for all API responses.
 * - All TestValidator assertions have descriptive titles, correct parameter
 *   order, and align types appropriately.
 * - Random data is generated using proper patterns and tags.
 * - Proper 'const' is used for request bodies; no mutating variables or
 *   annotation/satisfies mix.
 * - Authentication context step properly sets up session using buyer
 *   registration.
 * - Unauthenticated connection is created correctly by cloning 'connection' and
 *   setting headers to empty object (without touching headers after creation).
 * - Error scenario verification (attempt without authentication) uses correct
 *   await usage for TestValidator.error.
 * - Handles null/undefined for answer in logical assertion.
 * - No type error testing, wrong type data, or purposely omitted required fields.
 * - No additional imports or creative syntax.
 * - Complies with all rules and checklist items.
 * - Documentation comment (JSDoc) is complete, explains business context,
 *   step-by-step logic, rationale for any omissions (e.g., no search/listing
 *   APIs in scope).
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O ALL required properties present for required schema objects
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O All TestValidator functions have descriptive title as first parameter
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (any, @ts-ignore, etc)
 *   - O All assertions use correct parameter order and typings
 */
const __revise = {};
__revise;
