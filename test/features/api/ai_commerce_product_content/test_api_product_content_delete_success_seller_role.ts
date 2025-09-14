import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that an authenticated seller can delete a content entry (such as a
 * marketing description or specification) from their own product.
 *
 * 1. Register and authenticate as seller.
 * 2. Seller creates a product.
 * 3. Seller adds a content block to the product.
 * 4. Seller deletes the content entry for their product.
 * 5. (No verification API for fetch/list after delete in provided materials, so
 *    test focuses on successful flow and compilation constraints.)
 */
export async function test_api_product_content_delete_success_seller_role(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as seller
  const sellerEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IAiCommerceSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create a product as seller
  const productPayload = {
    seller_id: seller.id,
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    business_status: "pending_approval",
    current_price: 29900,
    inventory_quantity: 50 as number & tags.Type<"int32">,
  } satisfies IAiCommerceProduct.ICreate;
  const product: IAiCommerceProduct =
    await api.functional.aiCommerce.seller.products.create(connection, {
      body: productPayload,
    });
  typia.assert(product);

  // 3. Add a content block
  const contentPayload = {
    content_type: "spec",
    format: "markdown",
    locale: "en-US",
    content_body: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IAiCommerceProductContent.ICreate;
  const content: IAiCommerceProductContent =
    await api.functional.aiCommerce.seller.products.contents.create(
      connection,
      {
        productId: product.id,
        body: contentPayload,
      },
    );
  typia.assert(content);

  // 4. Delete the content
  await api.functional.aiCommerce.seller.products.contents.erase(connection, {
    productId: product.id,
    contentId: content.id,
  });
  // 5. No further verification available due to lack of fetch/list in provided API materials
}

/**
 * - Imports: No extra imports, only template imports used.
 * - Authentication: Used proper API for seller join and subsequent authenticated
 *   calls.
 * - Product creation: Used the DTO in exact shape, only required fields,
 *   type-safe.
 * - Content creation: Used published create API with correct request type, type
 *   safety.
 * - Content deletion: Used the documented SDK erase endpoint, passing required
 *   params.
 * - Random data: Used RandomGenerator, typia.random for all required/tagged
 *   fields and constraints.
 * - Logic: No response fetch validation for deleted content, as content GET/list
 *   endpoint is not provided.
 * - Await: Ensured every API call is awaited.
 * - TypeScript: No type assertion/any, type-safe everywhere, no
 *   nullable/undefined misuse.
 * - TestValidator: No response/data validation after typia.assert; no HTTP status
 *   code/manual validation.
 * - Markdown/code style: All TypeScript, no code blocks/markdown/documentation
 *   pollution.
 * - No prohibited patterns present.
 * - The test is limited to create/add/delete flows as only those API endpoints
 *   are available/allowed in the provided materials.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
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
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 */
const __revise = {};
__revise;
