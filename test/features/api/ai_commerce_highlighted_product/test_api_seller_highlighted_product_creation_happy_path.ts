import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates end-to-end business flow for seller highlighting their own
 * product for a campaign.
 *
 * 1. Seller registration (with valid email/password): ensures correct
 *    authentication context.
 * 2. Product creation: all fields supplied, seller_id bound to seller.
 * 3. Highlighted product creation: associates product to seller, schedules
 *    highlight.
 *
 * Checks:
 *
 * - Seller can highlight only their own product.
 * - Highlight record is returned with correct associations.
 * - All constraints (types, format, datetime, min/max, uuid) are met.
 *
 * Steps:
 *
 * 1. Register seller: call api.functional.auth.seller.join with random
 *    email/password.
 * 2. Create product: call api.functional.aiCommerce.seller.products.create,
 *    using seller's id for seller_id, store_id random, other product data
 *    random.
 * 3. Highlight product: call
 *    api.functional.aiCommerce.seller.highlightedProducts.create, using
 *    product's id for ai_commerce_product_id and seller's id for
 *    highlighted_by, schedule highlight_start_at to now and no end-date.
 * 4. Assert returned highlight associations are correct and typia.assert
 *    passes.
 */
export async function test_api_seller_highlighted_product_creation_happy_path(
  connection: api.IConnection,
) {
  // 1. Seller registration
  // Credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // arbitrary in [8,128]
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Product creation
  const seller_id = seller.id;
  const store_id = typia.random<string & tags.Format<"uuid">>();
  const product_code = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();
  const description = RandomGenerator.content({ paragraphs: 2 });
  const status = "active";
  const business_status = "compliance_ok";
  const current_price = Math.floor(Math.random() * 10000) + 100;
  const inventory_quantity = typia.random<number & tags.Type<"int32">>();
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id,
        store_id,
        product_code,
        name,
        description,
        status,
        business_status,
        current_price,
        inventory_quantity,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Highlighted product creation
  const highlight_start_at = new Date().toISOString();
  const highlighted =
    await api.functional.aiCommerce.seller.highlightedProducts.create(
      connection,
      {
        body: {
          ai_commerce_product_id: product.id,
          highlighted_by: seller_id,
          highlight_start_at,
          highlight_end_at: null,
          reason: RandomGenerator.paragraph(),
        } satisfies IAiCommerceHighlightedProduct.ICreate,
      },
    );
  typia.assert(highlighted);
  // 4. Validate highlight record refers to product & seller
  TestValidator.equals(
    "Highlighted product references correct product id",
    highlighted.ai_commerce_product_id,
    product.id,
  );
  TestValidator.equals(
    "Highlighted product references correct seller",
    highlighted.highlighted_by,
    seller_id,
  );
  TestValidator.equals(
    "Highlight start time is as scheduled",
    highlighted.highlight_start_at,
    highlight_start_at,
  );
}

/**
 * The draft correctly follows the scenario. It strictly uses only the provided
 * DTOs and API functions. There are no additional imports. All request bodies
 * use "satisfies" pattern without type annotations. All TestValidator calls
 * have descriptive titles and actual-first comparison. Random,
 * format-appropriate values are generated for all DTO fields (emails, uuids,
 * price, etc). Each API call uses await. The test never tests type errors, HTTP
 * status codes, or fictional endpoints. No authentication anti-patterns (like
 * directly manipulating headers) are present. Null and optional values
 * (highlight_end_at, reason) are handled with correct types (explicit null
 * assigned for open-ended). Business status and status are supplied as
 * domain-expected sample values. All steps are commented and structured
 * sequentially. No forbidden business logic is tested, and only success/happy
 * path is checked per requirements. No fields or logic outside schema are used.
 * The code is ready as final.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Function follows the correct naming convention
 *   - O All TestValidator functions include title as first parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O CRITICAL: NEVER touch connection.headers in any way
 *   - O CRITICAL: NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
 */
const __revise = {};
__revise;
