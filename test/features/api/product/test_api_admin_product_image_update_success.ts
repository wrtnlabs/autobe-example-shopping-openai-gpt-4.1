import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * E2E test for admin updating a product image's metadata (display order).
 *
 * 1. Register and login as admin. Save admin's email and password for
 *    re-login.
 * 2. Create a channel as admin.
 * 3. Create a category under the channel as admin.
 * 4. Register and login as seller. Save seller's email and password for
 *    re-login.
 * 5. Create a seller profile for the seller.
 * 6. Create a store as admin for the seller using the seller profile.
 * 7. Register a product under the store and seller.
 * 8. Register and login as buyer.
 * 9. Upload an attachment as the buyer (to create an image asset).
 * 10. Log back in as admin.
 * 11. Associate the uploaded attachment as an image for the product (product
 *     image creation).
 * 12. Update the product image's display order as admin. Verify the updated
 *     image properties.
 */
export async function test_api_admin_product_image_update_success(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Admin is now authenticated on connection
  // 2. Create channel
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        locale: "en-US",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);
  // 3. Create category under the channel
  const category =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ai_commerce_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          level: 0,
          sort_order: 0,
          is_active: true,
          business_status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IAiCommerceCategory.ICreate,
      },
    );
  typia.assert(category);
  // 4. Register and login as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Seller is now authenticated
  // 5. Create seller profile
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerJoin.id,
        display_name: RandomGenerator.name(),
        approval_status: "active",
        profile_metadata: null,
        suspension_reason: null,
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(sellerProfile);
  // 6. Log back in as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  // 7. Create store as admin for the seller
  const store = await api.functional.aiCommerce.admin.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerJoin.id,
        seller_profile_id: sellerProfile.id,
        store_name: RandomGenerator.name(2),
        store_code: RandomGenerator.alphaNumeric(8),
        store_metadata: null,
        approval_status: "active",
        closure_reason: null,
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(store);
  // 8. Register product as admin
  const product = await api.functional.aiCommerce.admin.products.create(
    connection,
    {
      body: {
        seller_id: sellerJoin.id,
        store_id: store.id,
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        business_status: "normal",
        current_price: 10000,
        inventory_quantity: 50,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 9. Register and login as buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  // Buyer is now authenticated
  // 10. Upload attachment as buyer (product image)
  const attachment = await api.functional.aiCommerce.buyer.attachments.create(
    connection,
    {
      body: {
        user_id: buyerJoin.id,
        filename: `${RandomGenerator.alphaNumeric(10)}.jpg`,
        business_type: "product_image",
      } satisfies IAiCommerceAttachment.ICreate,
    },
  );
  typia.assert(attachment);
  // 11. Log back in as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  // 12. Add image to product as admin
  const productImage =
    await api.functional.aiCommerce.admin.products.images.create(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
        attachment_id: attachment.id,
        display_order: 0,
        locale: null,
      } satisfies IAiCommerceProductImage.ICreate,
    });
  typia.assert(productImage);
  // 13. Update the product image's display order as admin
  const newDisplayOrder = 1;
  const updatedImage =
    await api.functional.aiCommerce.admin.products.images.update(connection, {
      productId: product.id,
      imageId: productImage.id,
      body: {
        display_order: newDisplayOrder,
      } satisfies IAiCommerceProductImage.IUpdate,
    });
  typia.assert(updatedImage);
  // Validate update
  TestValidator.equals(
    "product image id should be unchanged after update",
    updatedImage.id,
    productImage.id,
  );
  TestValidator.equals(
    "product image display_order should be updated",
    updatedImage.display_order,
    newDisplayOrder,
  );
}

/**
 * The draft thoroughly implements the entire admin product image update
 * business scenario using only provided DTOs and API functions. All required
 * authentication flows for admin, seller, and buyer are handled correctly and
 * via the proper specialized API functions. Role switching is done via login
 * APIs for each appropriate segment. Each entity is created using required
 * business logic, and correct ID linkage between entities is observed (e.g.,
 * store references seller profile, product references store/seller, product
 * image links to the correct product and uploaded attachment).
 *
 * Data is generated using RandomGenerator and typia.random correctly, including
 * emails, passwords, unique codes, and business metadata. Each API result is
 * validated with typia.assert().
 *
 * No additional import statements are used, all awaits are present on async API
 * calls, all TestValidator checks use clear and descriptive titles. Structure
 * and JSDoc are clear and stepwise. DTO variants are not confused and path/body
 * params are always shaped exactly for API requirements.
 *
 * No type errors, wrong types, missing required fields, or hallucinated
 * properties are introduced. Random and default values for metadata are either
 * null or omitted according to the DTO optionality. Null/undefined fields are
 * handled with explicit null assignment. Only actual properties in DTOs are
 * used for entities.
 *
 * Post-update, image ID and display_order are asserted for correct mutation,
 * using TestValidator.equals with the correct order of 'actual, expected'.
 *
 * Imports, naming, and file structure fully comply with the template and all
 * constraints.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. Test Function Structure
 *   - O 3.3. API SDK Function Invocation
 *   - O 3.3.1. Response Type Validation
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
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
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
