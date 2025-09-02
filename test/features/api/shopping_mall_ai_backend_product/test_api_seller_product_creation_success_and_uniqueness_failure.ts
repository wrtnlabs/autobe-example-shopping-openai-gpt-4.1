import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_seller_product_creation_success_and_uniqueness_failure(
  connection: api.IConnection,
) {
  /**
   * Test seller product registration including successful creation and unique
   * slug enforcement.
   *
   * 1. Register a new seller (including authentication)
   * 2. Create the first product with a unique slug and verify the creation
   *    response and all fields
   * 3. Attempt to register a second product using the same slug as the first,
   *    expecting a uniqueness error
   * 4. Validate error handling semantics (type and message if possible)
   */

  // 1. Register a new seller
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  const seller = sellerAuth.seller;
  typia.assert(seller);

  // 2. Create the first product (success scenario)
  const uniqueSlug = RandomGenerator.alphaNumeric(16);
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    slug: uniqueSlug,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: "TAX_STANDARD_01",
    sort_priority: 111,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const firstProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(firstProduct);
  TestValidator.equals(
    "Product slug should match input",
    firstProduct.slug,
    productInput.slug,
  );
  TestValidator.equals(
    "Product title should match input",
    firstProduct.title,
    productInput.title,
  );
  TestValidator.equals(
    "Product business status matches input",
    firstProduct.business_status,
    productInput.business_status,
  );
  TestValidator.predicate(
    "Product ID is a non-empty string",
    typeof firstProduct.id === "string" && firstProduct.id.length > 0,
  );
  TestValidator.predicate(
    "Product creation time matches ISO 8601 format",
    typeof firstProduct.created_at === "string" &&
      !isNaN(Date.parse(firstProduct.created_at)),
  );
  TestValidator.predicate(
    "Product is not soft deleted after creation",
    firstProduct.deleted_at === null || firstProduct.deleted_at === undefined,
  );
  TestValidator.equals(
    "Product min order quantity matches input",
    firstProduct.min_order_quantity,
    productInput.min_order_quantity,
  );
  TestValidator.equals(
    "Product max order quantity matches input",
    firstProduct.max_order_quantity,
    productInput.max_order_quantity,
  );
  TestValidator.equals(
    "Product tax code matches input",
    firstProduct.tax_code,
    productInput.tax_code,
  );
  TestValidator.equals(
    "Product sort priority matches input",
    firstProduct.sort_priority,
    productInput.sort_priority,
  );

  // 3. Attempt to create a second product with the same slug (should fail)
  const duplicateProductInput = {
    ...productInput,
    title: productInput.title + " Copy",
    // slug remains identical to test uniqueness constraint
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  await TestValidator.error(
    "Creating product with duplicate slug should fail (unique constraint)",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.create(
        connection,
        {
          body: duplicateProductInput,
        },
      );
    },
  );
}
