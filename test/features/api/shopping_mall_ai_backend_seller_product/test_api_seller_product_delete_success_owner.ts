import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_product_delete_success_owner(
  connection: api.IConnection,
) {
  /**
   * Test successful soft deletion (logical deletion) of a product by its owning
   * seller.
   *
   * 1. Register a seller (provides authentication, allowing product-level
   *    operations)
   * 2. (Mock step) Generate a fake product UUID as no creation API is provided in
   *    SDK
   * 3. Attempt to delete the product by its UUID, as the owner/seller
   * 4. (Validation limitation) Cannot confirm deleted_at or listing exclusion due
   *    to lack of product read/list APIs in provided contracts
   *
   * This validates the owner can invoke the endpoint, which is the only
   * implementable scope with current materials.
   */

  // 1. Register a seller to establish owner and authentication context
  const sellerReg = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerReg);

  // 2. (Mock) Generate a product UUID for testing, since creation endpoint is missing
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to soft-delete the product as owner
  await api.functional.shoppingMallAiBackend.seller.products.erase(connection, {
    productId,
  });

  // 4. (Validation limitation): No listing/read endpoint to confirm soft-delete. Test is limited to endpoint invocation with no error thrown.
}
