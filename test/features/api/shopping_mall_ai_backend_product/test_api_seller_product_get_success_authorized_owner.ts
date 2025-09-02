import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_seller_product_get_success_authorized_owner(
  connection: api.IConnection,
) {
  /**
   * Test: Seller retrieves detailed info of their own newly created product
   *
   * Steps:
   *
   * 1. Register a seller (join API, also authenticates the session)
   * 2. (Mock/simulate) Create a new product for the seller (no product creation
   *    endpoint present; use typia.random)
   * 3. Retrieve product detail by productId through authorized seller role
   * 4. Assert all major product fields match between expected (simulated) and
   *    actual (retrieved)
   *
   * Covers:
   *
   * - API role authentication
   * - Product detail read access (owner-seller)
   * - Field-by-field value checking (business, commerce, and audit fields)
   * - DTO type assertions
   */

  // 1. Register a new seller and authenticate
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const auth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert(auth);

  // 2. Simulate a product for this seller (since there's no creation endpoint)
  const expectedProduct: IShoppingMallAiBackendProduct =
    typia.random<IShoppingMallAiBackendProduct>();

  // 3. Retrieve product details
  const retrieved: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.seller.products.at(connection, {
      productId: expectedProduct.id,
    });
  typia.assert(retrieved);

  // 4. Validate main product properties
  TestValidator.equals(
    "retrieved product title matches",
    retrieved.title,
    expectedProduct.title,
  );
  TestValidator.equals(
    "retrieved product slug matches",
    retrieved.slug,
    expectedProduct.slug,
  );
  TestValidator.equals(
    "retrieved product type matches",
    retrieved.product_type,
    expectedProduct.product_type,
  );
  TestValidator.equals(
    "retrieved product business_status matches",
    retrieved.business_status,
    expectedProduct.business_status,
  );
  TestValidator.equals(
    "retrieved min_order_quantity matches",
    retrieved.min_order_quantity,
    expectedProduct.min_order_quantity,
  );
  TestValidator.equals(
    "retrieved max_order_quantity matches",
    retrieved.max_order_quantity,
    expectedProduct.max_order_quantity,
  );
  TestValidator.equals(
    "retrieved tax_code matches",
    retrieved.tax_code,
    expectedProduct.tax_code,
  );
  TestValidator.equals(
    "retrieved sort_priority matches",
    retrieved.sort_priority,
    expectedProduct.sort_priority,
  );
  TestValidator.equals(
    "retrieved product description matches",
    retrieved.description,
    expectedProduct.description,
  );
  TestValidator.equals(
    "retrieved created_at matches",
    retrieved.created_at,
    expectedProduct.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches",
    retrieved.updated_at,
    expectedProduct.updated_at,
  );
  TestValidator.equals(
    "retrieved deleted_at matches",
    retrieved.deleted_at,
    expectedProduct.deleted_at,
  );
}
