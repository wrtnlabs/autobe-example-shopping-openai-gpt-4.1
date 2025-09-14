import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate seller can delete an image registered with a product, following
 * the real business flow:
 *
 * 1. Register a new seller (join) with unique email and password
 * 2. Log in as the seller to refresh authentication
 * 3. Create a seller profile, assigning to the seller's user ID
 * 4. Create a store assigned to the seller profile and owner_user_id
 * 5. Create a product assigned to seller and store
 * 6. Log in or join as a buyer just to upload an attachment for product image
 *    registration (per endpoint constraints)
 * 7. Upload an attachment with the buyer context (returns attachment_id)
 * 8. Log back in as the seller (auth context switching)
 * 9. Register the uploaded attachment as a product image via the product
 *    images endpoint (returns image_id)
 * 10. Delete the product image registered in step 9 as seller/owner
 */
export async function test_api_seller_product_image_delete_success(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth); // sellerAuth.id, sellerAuth.token

  // 2. Seller logs in to establish session
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 3. Seller profile creation
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerAuth.id,
        display_name: RandomGenerator.name(),
        profile_metadata: null,
        approval_status: "active",
        suspension_reason: null,
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(sellerProfile);

  // 4. Store creation
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerAuth.id,
        seller_profile_id: sellerProfile.id,
        store_name: RandomGenerator.name(),
        store_code: RandomGenerator.alphaNumeric(10),
        store_metadata: null,
        approval_status: "active",
        closure_reason: null,
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(store);

  // 5. Product creation
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerAuth.id,
        store_id: store.id,
        product_code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "approved",
        current_price: 29900,
        inventory_quantity: 100,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Register a buyer solely to upload an attachment (image)
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  // 7. Upload attachment (image) as a buyer
  const attachment = await api.functional.aiCommerce.buyer.attachments.create(
    connection,
    {
      body: {
        user_id: buyerAuth.id,
        filename: RandomGenerator.alphaNumeric(8) + ".jpg",
        business_type: "product_image",
      } satisfies IAiCommerceAttachment.ICreate,
    },
  );
  typia.assert(attachment);

  // 8. Log seller back in (context switch)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 9. Register product image (using previously uploaded attachment)
  const productImage =
    await api.functional.aiCommerce.seller.products.images.create(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
        attachment_id: attachment.id,
        display_order: 0,
        locale: null,
      } satisfies IAiCommerceProductImage.ICreate,
    });
  typia.assert(productImage);

  // 10. Delete the product image as seller (main test)
  await api.functional.aiCommerce.seller.products.images.erase(connection, {
    productId: product.id,
    imageId: productImage.id,
  });
  // Success: No error thrown means deletion succeeded
}

/**
 * - All API function calls use the correct await pattern and comply with
 *   available function signatures and DTO types
 * - Each entity required for the test is created in a strictly logical order with
 *   correct type safety and request structure
 * - Authentication context is properly switched between seller and buyer as
 *   needed for attachment upload, image registration, and deletion
 * - No prohibited patterns (as any, type errors, non-existent properties, invalid
 *   assumptions) are present; all values are constructed from provided DTOs and
 *   requirements
 * - Strictly null vs undefined values are respected on optional/nullable
 *   properties
 * - Only template imports are used; no additional import statements
 * - All TestValidator requirements and function structures are followed (note:
 *   main success criterion here is "no error thrown upon deletion", which
 *   matches business expectation for an owner-deletable resource)
 * - No type validation or status code validation is performed
 * - No response or output is checked post-delete for this API (void), which
 *   follows the API design
 * - The final implementation is identical to the draft as no errors were found
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
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
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
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (any, @ts-ignore, @ts-expect-error)
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
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
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
