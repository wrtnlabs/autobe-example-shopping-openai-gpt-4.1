import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import type { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Buyer posts a comment to their own inquiry, checks linkage.
 *
 * 1. Register a new buyer (api.functional.auth.buyer.join).
 * 2. Create a product inquiry as the buyer
 *    (api.functional.aiCommerce.buyer.inquiries.create).
 * 3. Post a new comment to the inquiry as the same buyer
 *    (api.functional.aiCommerce.buyer.inquiries.comments.create).
 * 4. Assert returned comment has proper author_id and inquiry_id, and correct
 *    body content.
 */
export async function test_api_buyer_inquiry_comment_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new buyer
  const buyerRegister = await api.functional.auth.buyer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerRegister);

  // 2. Create a new inquiry as the buyer for some product
  // We'll simulate a product_id UUID for the sake of inquiry creation
  const inquiryCreateBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    question: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
  } satisfies IAiCommerceInquiry.ICreate;

  const inquiry = await api.functional.aiCommerce.buyer.inquiries.create(
    connection,
    {
      body: inquiryCreateBody,
    },
  );
  typia.assert(inquiry);

  // 3. Post a comment to the inquiry as the same buyer
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    // Test top-level comment (no parent), explicit visibility
    visibility: "public",
  } satisfies IAiCommerceComment.ICreate;

  const comment =
    await api.functional.aiCommerce.buyer.inquiries.comments.create(
      connection,
      {
        inquiryId: inquiry.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 4. Validation: comment.author_id = buyerRegister.id; comment.inquiry_id = inquiry.id; comment.body = commentBody.body
  TestValidator.equals(
    "comment is attached to correct buyer",
    comment.author_id,
    buyerRegister.id,
  );
  TestValidator.equals(
    "comment is attached to correct inquiry",
    comment.inquiry_id,
    inquiry.id,
  );
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    commentBody.body,
  );
}

/**
 * The draft implementation thoroughly follows the scenario requirements and
 * complies with all critical system and TypeScript type safety rules:
 *
 * - Imports are untouched and only used as provided in the template
 * - All API calls are done with proper await usage (no missing awaits)
 * - Buyer registration uses valid random email and password types
 * - Product inquiry is created with a random UUID for product_id, as information
 *   about actual products is out of scope
 * - Comment is posted to the inquiry with top-level (no parent), and visibility
 *   set to 'public' for clarity
 * - Validation checks use TestValidator.equals with descriptive first-title
 *   parameters and follow the actual-first, expected-second pattern
 * - All ids are correctly asserted using fields from actual API responses
 * - No helper functions or code defined outside the main test
 * - No type error testing, no wrong type usage, no fictional code
 * - Business logic matches DTOs and only schema-defined properties are used
 * - Proper documentation is included at the function level to describe workflow
 *   and purpose
 *
 * No corrections are necessary, and the produced code is ready for production
 * use.
 *
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
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O NO fictional functions or types from examples are used
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O TestValidator functions have descriptive titles as first parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O All TestValidator functions have proper positional parameter syntax
 *   - O No external functions outside the main function
 *   - O Function follows correct naming convention and signature
 *   - O Only actual API functions and DTOs are used
 *   - O Proper random data generation and constraints
 *   - O Proper null/undefined handling
 */
const __revise = {};
__revise;
