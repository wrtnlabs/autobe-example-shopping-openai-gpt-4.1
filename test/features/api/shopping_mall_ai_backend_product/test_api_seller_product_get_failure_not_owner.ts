import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_seller_product_get_failure_not_owner(
  connection: api.IConnection,
) {
  /**
   * Test failure when a seller attempts to get product details for a product
   * they do not own.
   *
   * Steps:
   *
   * 1. Register seller A via /auth/seller/join and obtain their context.
   * 2. (Since there is no create product endpoint, assume a mock UUID for the
   *    productId.)
   * 3. Register seller B via /auth/seller/join (the connection context with JWT
   *    will switch accordingly).
   * 4. Seller B attempts to retrieve the product details for the product owned by
   *    seller A using GET /shoppingMallAiBackend/seller/products/{productId}.
   * 5. Expect an error is thrown (forbidden or not found) confirming that sellers
   *    cannot access each other's products.
   */
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerARegNo = RandomGenerator.alphaNumeric(10);
  const sellerAName = RandomGenerator.name();
  const sellerAJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      business_registration_number: sellerARegNo,
      name: sellerAName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAJoin);

  // The test cannot actually create a product as seller A, so we use a mock UUID.
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Register a second seller, switching the session context to seller B.
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBRegNo = RandomGenerator.alphaNumeric(10);
  const sellerBName = RandomGenerator.name();
  const sellerBJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      business_registration_number: sellerBRegNo,
      name: sellerBName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerBJoin);

  // Now, as seller B, try to get product details for a product owned by seller A - should fail
  await TestValidator.error(
    "seller B cannot get product details for seller A's product",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.at(
        connection,
        {
          productId,
        },
      );
    },
  );
}
