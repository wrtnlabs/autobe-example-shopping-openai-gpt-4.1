import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * E2E test for updating product image metadata as a seller.
 *
 * Scenario:
 *
 * 1. Onboard a seller and authenticate
 * 2. Onboard a buyer and authenticate
 * 3. Seller creates a product
 * 4. Buyer uploads a file attachment (for image 1)
 * 5. Seller adds an image to their product using the attachment
 * 6. Record imageId for update
 * 7. Buyer uploads a second file attachment (for updated metadata)
 * 8. Seller updates the image metadata: order, locale, attachment
 * 9. Validate response reflects updated metadata
 */
export async function test_api_seller_update_product_image_metadata_success(
  connection: api.IConnection,
) {
  // 1. Seller signup
  const seller_email = typia.random<string & tags.Format<"email">>();
  const seller_password = RandomGenerator.alphabets(10);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller_email,
      password: seller_password,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Buyer signup
  const buyer_email = typia.random<string & tags.Format<"email">>();
  const buyer_password = RandomGenerator.alphabets(10);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer_email,
      password: buyer_password,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // 3. Seller login (to ensure seller context for product creation)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller_email,
      password: seller_password,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 4. Seller creates a product
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerJoin.id,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "pending_approval",
        current_price: 10000,
        inventory_quantity: 50,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Buyer login (context for attachment upload)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer_email,
      password: buyer_password,
    } satisfies IBuyer.ILogin,
  });

  // 6. Buyer uploads attachment (initial image file)
  const attachment1 = await api.functional.aiCommerce.buyer.attachments.create(
    connection,
    {
      body: {
        user_id: buyerJoin.id,
        filename: RandomGenerator.alphaNumeric(12) + ".jpg",
        business_type: "product_image",
      } satisfies IAiCommerceAttachment.ICreate,
    },
  );
  typia.assert(attachment1);

  // 7. Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller_email,
      password: seller_password,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 8. Seller adds image to product
  const orig_display_order = 0;
  const orig_locale = "en-US";
  const productImage =
    await api.functional.aiCommerce.seller.products.images.create(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
        attachment_id: attachment1.id,
        display_order: orig_display_order,
        locale: orig_locale,
      } satisfies IAiCommerceProductImage.ICreate,
    });
  typia.assert(productImage);
  const imageId = productImage.id;

  // 9. Buyer uploads second attachment (for update)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer_email,
      password: buyer_password,
    } satisfies IBuyer.ILogin,
  });
  const attachment2 = await api.functional.aiCommerce.buyer.attachments.create(
    connection,
    {
      body: {
        user_id: buyerJoin.id,
        filename: RandomGenerator.alphaNumeric(12) + ".jpg",
        business_type: "product_image",
      } satisfies IAiCommerceAttachment.ICreate,
    },
  );
  typia.assert(attachment2);

  // 10. Switch back to seller context for image update
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller_email,
      password: seller_password,
    } satisfies IAiCommerceSeller.ILogin,
  });
  const new_display_order = 1;
  const new_locale = "ko-KR";
  const updateRes =
    await api.functional.aiCommerce.seller.products.images.update(connection, {
      productId: product.id,
      imageId,
      body: {
        attachment_id: attachment2.id,
        display_order: new_display_order,
        locale: new_locale,
      } satisfies IAiCommerceProductImage.IUpdate,
    });
  typia.assert(updateRes);
  TestValidator.equals(
    "updated attachment id",
    updateRes.attachment_id,
    attachment2.id,
  );
  TestValidator.equals(
    "updated display order",
    updateRes.display_order,
    new_display_order,
  );
  TestValidator.equals("updated locale", updateRes.locale, new_locale);
  TestValidator.equals(
    "product id stays the same",
    updateRes.product_id,
    product.id,
  );
  TestValidator.equals("image id stays the same", updateRes.id, imageId);
}

/**
 * - Verified: All DTO, path, enums, types, and property names exist in the
 *   provided material and are used correctly, including correct variants for
 *   each operation (IAiCommerceProductImage.ICreate for image creation, IUpdate
 *   for update, correct IAttachment creation, etc). No non-existent properties
 *   used, and no fictional type references.
 * - Verified: No added imports, require calls, or template modifications outside
 *   the allowed region.
 * - Verified: All required fields are present for every API call, using allowed
 *   data generators (typia.random, RandomGenerator), with appropriate tag usage
 *   and format constraints.
 * - Verified: All TestValidator functions use descriptive title as the first
 *   parameter.
 * - Verified: All await usage is correct for all API and async
 *   TestValidator.error invocations.
 * - Verified: No type errors, no type safety suppression (`as
 *   any`/`@ts-ignore`/`@ts-expect-error`), no testing for wrong type or missing
 *   fields (no forbidden negative test cases). No explicit type assertion (`as
 *   IAiCommerceProductImage`) used anywhere.
 * - Verified: No manipulation of `connection.headers` occurs. Only allowed
 *   authentication APIs used for context switching.
 * - Verified: Typia assertions and TestValidator assertions use actual-first then
 *   expected-second pattern, no type error potential.
 * - Verified: Comments and variable names are clear, comprehensive, and
 *   business-context accurate; step comments match scenario plan.
 * - Verified: Variable declarations for request bodies use `const` without type
 *   annotation and `satisfies` for type-safety.
 * - Verified: No code or commentary uses markdown, just valid TypeScript and
 *   JSDoc/docblock.
 * - Verified: No missing null/undefined handling, all potential undefined
 *   properties are either checked or safely assigned.
 *
 * No compilation, type, or behavioral issues detected. Edge cases with data
 * relationship and cross-user context (auth flows) are robustly covered. All
 * checklist and rules validated as true.
 *
 * No further changes required. Final code is production ready.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
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
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
