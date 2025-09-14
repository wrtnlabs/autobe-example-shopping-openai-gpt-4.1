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
 * Full workflow test for seller successfully adding an image to their
 * product.
 *
 * This scenario covers both seller and buyer authentication, product
 * creation, buyer uploading an attachment (image), then seller linking that
 * attachment as a product image. The seller must switch authentication
 * context as needed. Validates all relationships and key business logic
 * steps.
 *
 * Steps:
 *
 * 1. Register a new seller (sellerEmail, strong password)
 * 2. Authenticate seller (login as seller)
 * 3. Create a new product with valid details (seller_id and store_id, etc.)
 * 4. Register a new buyer (buyerEmail, strong password)
 * 5. Authenticate buyer (login as buyer)
 * 6. Create a new attachment as the buyer for type 'product_image', collect
 *    attachmentId
 * 7. Authenticate seller again (login as seller)
 * 8. Add a product image as seller, using the created product id and the
 *    buyer's attachment id (in request body)
 * 9. Validate the product image entity: image exists, is linked to both
 *    product and attachment, display_order is 0, locale is default/null,
 *    and all metadata is correct
 *
 * Test asserts successful image creation and all key relationships, with
 * full type and business validation at each step.
 */
export async function test_api_seller_add_product_image_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Authenticate seller (login)
  const sellerAuth = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(sellerAuth);

  // 3. Create product as seller
  const productBody = {
    seller_id: sellerAuth.id,
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    business_status: "pending_approval",
    current_price: 1000,
    inventory_quantity: 100,
  } satisfies IAiCommerceProduct.ICreate;
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);
  TestValidator.equals(
    "created product must have correct seller_id",
    product.seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "product code assigned",
    product.product_code,
    productBody.product_code,
  );

  // 4. Register a new buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // 5. Authenticate buyer
  const buyerAuth = await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  typia.assert(buyerAuth);

  // 6. Create attachment as buyer (business_type = product_image)
  const attachmentBody = {
    user_id: buyerAuth.id,
    filename: RandomGenerator.alphaNumeric(10) + ".jpg",
    business_type: "product_image",
  } satisfies IAiCommerceAttachment.ICreate;
  const attachment = await api.functional.aiCommerce.buyer.attachments.create(
    connection,
    { body: attachmentBody },
  );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment business_type",
    attachment.business_type,
    "product_image",
  );

  // 7. Authenticate seller again
  const sellerAuthAgain = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(sellerAuthAgain);

  // 8. Add product image as seller
  const imageBody = {
    product_id: product.id,
    attachment_id: attachment.id,
    display_order: 0,
    locale: null,
  } satisfies IAiCommerceProductImage.ICreate;
  const image = await api.functional.aiCommerce.seller.products.images.create(
    connection,
    {
      productId: product.id,
      body: imageBody,
    },
  );
  typia.assert(image);

  // 9. Validate created image entity
  TestValidator.equals(
    "image.product_id matches",
    image.product_id,
    product.id,
  );
  TestValidator.equals(
    "image.attachment_id matches",
    image.attachment_id,
    attachment.id,
  );
  TestValidator.equals(
    "image.display_order defaulted to 0",
    image.display_order,
    0,
  );
  TestValidator.equals(
    "image.locale must be null or undefined",
    image.locale ?? null,
    null,
  );
}

/**
 * 1. All API SDK calls use correct imports and are awaited.
 * 2. All request/response DTOs match the types defined and passed to the correct
 *    property (no type mismatches, no confusion between base and ICreate
 *    variants).
 * 3. No additional imports, no manipulation of connection.headers,
 *    authentication/switching is via actual login/join APIs.
 * 4. All required properties are included in API calls (no missing data), and
 *    constrained by typia tags as required.
 * 5. No type error testing, as any, or missing required fields. All error/edge
 *    case checking only performed as business logic validation.
 * 6. Proper null/undefined handling patterns for nullable fields (image.locale
 *    checked for null/undefined equivalence).
 * 7. Random password and identifiers generated properly with alphaNumeric and
 *    typia.random.
 * 8. All TestValidator function calls use descriptive titles and proper argument
 *    ordering.
 * 9. All comments and documentation are adapted to scenario and business
 *    requirements.
 * 10. No response type validation after typia.assert; typia.assert is the only type
 *     validation used.
 * 11. All steps in the test are contained inside the test function, using only
 *     provided imports and types.
 * 12. No mistakes with typia.random tag syntax, no omitted generic args.
 * 13. No errors found; test covers full business workflow from authentication to
 *     image link validation.
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
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All API calls use proper parameter structure and type safety
 *   - O Authentication is handled by actual authentication APIs only
 *   - O NO connection.headers manipulation
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator functions have descriptive title as FIRST parameter
 *   - O TestValidator function order is actual, expected
 *   - O All TestValidator.error() async callbacks are awaited
 *   - O NO type error testing, NO as any, NO testing type validation
 *   - O All API responses are validated with typia.assert()
 *   - O All required properties are included in requests
 *   - O No unimplementable scenario parts implemented
 *   - O Function code is pure TypeScript, not Markdown
 */
const __revise = {};
__revise;
