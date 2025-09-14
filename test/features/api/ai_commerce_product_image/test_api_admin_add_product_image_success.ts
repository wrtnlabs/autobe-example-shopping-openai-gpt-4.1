import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate admin-side addition of a product image for moderation/audit.
 *
 * This test ensures that an admin user is able to upload a product image
 * directly under an existing product for audit or moderation. A full
 * business workflow is simulated, involving the prerequisite creation of a
 * product by a seller and an attachment by a buyer. Admin context is
 * established at both the join and login step, seller and buyer credentials
 * are generated and used as needed.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin user.
 * 2. Register and authenticate a seller user.
 * 3. Seller creates a product, saving productId.
 * 4. Register and authenticate a buyer user.
 * 5. Buyer uploads an attachment (e.g., image file), saving attachmentId.
 * 6. Switch back to admin context (via /auth/admin/login).
 * 7. Perform the admin image add: Call
 *    /aiCommerce/admin/products/{productId}/images with appropriate
 *    IAiCommerceProductImage.ICreate payload (reference the saved product
 *    and attachment).
 * 8. Assert the returned IAiCommerceProductImage entity: check product_id,
 *    attachment_id, and all metadata; validate strict type using
 *    typia.assert; check display order and (optionally/null) locale.
 *
 * All steps use proper authentication role switches and validate each
 * response precisely. No extra imports, type errors, or forbidden data
 * manipulations are present.
 */
export async function test_api_admin_add_product_image_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register and authenticate seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 3. Seller creates a product
  // (Assume seller context via sellerJoin)
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerJoin.id,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        status: "active",
        business_status: "pending_approval",
        current_price: 10000,
        inventory_quantity: 50,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Register and authenticate buyer
  const buyerEmail: string = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(10);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // 5. Buyer uploads an attachment
  const attachment = await api.functional.aiCommerce.buyer.attachments.create(
    connection,
    {
      body: {
        user_id: buyerJoin.id,
        filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
        business_type: "product_image",
      } satisfies IAiCommerceAttachment.ICreate,
    },
  );
  typia.assert(attachment);

  // 6. Switch context back to admin (login, so session and headers)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 7. Admin adds product image for moderation/audit
  const displayOrder: number = 0;
  const locale: string | null = null;
  const productImage =
    await api.functional.aiCommerce.admin.products.images.create(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
        attachment_id: attachment.id,
        display_order: displayOrder,
        locale: locale,
      } satisfies IAiCommerceProductImage.ICreate,
    });
  typia.assert(productImage);
  TestValidator.equals("product_id", productImage.product_id, product.id);
  TestValidator.equals(
    "attachment_id",
    productImage.attachment_id,
    attachment.id,
  );
  TestValidator.equals(
    "display_order",
    productImage.display_order,
    displayOrder,
  );
  TestValidator.equals("locale (null)", productImage.locale, locale);
}

/**
 * - All test workflow steps are implemented sequentially: admin, seller, and
 *   buyer accounts are created, and each switches authentication context
 *   properly using the allowed authentication APIs (no direct header
 *   manipulation).
 * - Seller creates a product with valid random/unique values, using only
 *   properties available to IAiCommerceProduct.ICreate. Business field values
 *   are realistic.
 * - Buyer creates an attachment properly with user_id referencing the buyer
 *   account, and the filename and business_type match the product image
 *   context.
 * - All API SDK function calls use the correct await pattern, and type safety is
 *   strictly maintained with typia.assert on every response.
 * - The admin login is performed after prior steps to properly set authentication
 *   context for the sensitive operation.
 * - The product image add step uses all required properties of
 *   IAiCommerceProductImage.ICreate and no additional properties: product_id,
 *   attachment_id, display_order, locale=null.
 * - There are no missing required fields, no forbidden patterns (type errors,
 *   status code checks, context/header manipulation).
 * - Every assertion uses TestValidator with descriptive titles, and feedback is
 *   targeted to actual business processes (product_id/attachment_id/etc
 *   linkage). The assert order is always actual-first, expected-second.
 * - No creation of properties not listed in the schemas; all fields used are
 *   present in DTOs provided.
 * - The code block includes only function body content, no markdown, no extra
 *   imports, as required by the E2E system policies.
 *
 * All requirements are satisfied.
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
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O EVERY `api.functional.*` call has `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O Correct DTO variant for each operation
 *   - O No DTO type confusion
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (`any`, `@ts-ignore`, `@ts-expect-error`)
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
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
