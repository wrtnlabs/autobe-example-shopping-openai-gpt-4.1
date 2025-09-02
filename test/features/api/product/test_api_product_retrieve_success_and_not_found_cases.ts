import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * E2E test for product retrieval - success and not found scenarios.
 *
 * This function validates the retrieval of a product by productId using
 * public (unauthenticated) access. It first provisions a new seller
 * account, then registers a new product as that seller. It then retrieves
 * the product by its ID to verify all returned fields. In the not-found
 * scenario, it tries to fetch a product by a UUID that does not exist and
 * checks that the correct error is returned.
 *
 * Steps:
 *
 * 1. Register a new seller account (using unique email and business
 *    registration number).
 * 2. Create a new product as the seller with valid details.
 * 3. Retrieve the product by its productId using the public endpoint. Assert
 *    all returned product fields.
 * 4. Attempt to retrieve a product with a random, non-existent UUID. Assert
 *    that a not found error is returned.
 */
export async function test_api_product_retrieve_success_and_not_found_cases(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessRegNo = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: businessRegNo,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // 2. Create product as seller
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const createdProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(createdProduct);

  // 3. Retrieve product by productId (unauthenticated)
  // Use public connection: remove Authorization if present
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const retrieved = await api.functional.shoppingMallAiBackend.products.at(
    publicConn,
    {
      productId: createdProduct.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals(
    "Returned product matches created",
    retrieved.id,
    createdProduct.id,
  );
  TestValidator.equals("Title matches", retrieved.title, productInput.title);
  TestValidator.equals("Slug matches", retrieved.slug, productInput.slug);
  TestValidator.equals(
    "Description matches",
    retrieved.description,
    productInput.description,
  );
  TestValidator.equals(
    "Product type matches",
    retrieved.product_type,
    productInput.product_type,
  );
  TestValidator.equals(
    "Business status matches",
    retrieved.business_status,
    productInput.business_status,
  );
  TestValidator.equals(
    "Min order quantity matches",
    retrieved.min_order_quantity,
    productInput.min_order_quantity,
  );
  TestValidator.equals(
    "Max order quantity matches",
    retrieved.max_order_quantity,
    productInput.max_order_quantity,
  );
  TestValidator.equals(
    "Tax code matches",
    retrieved.tax_code,
    productInput.tax_code,
  );
  TestValidator.equals(
    "Sort priority matches",
    retrieved.sort_priority,
    productInput.sort_priority,
  );

  // 4. Not found scenario: try to retrieve product with non-existent UUID
  let fakeProductId = typia.random<string & tags.Format<"uuid">>();
  while (fakeProductId === createdProduct.id) {
    fakeProductId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "Retrieving non-existent product returns not found",
    async () => {
      await api.functional.shoppingMallAiBackend.products.at(publicConn, {
        productId: fakeProductId,
      });
    },
  );
}
