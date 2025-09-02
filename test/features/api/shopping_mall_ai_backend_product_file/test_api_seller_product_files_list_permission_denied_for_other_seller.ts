import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import type { IPageIShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that a seller cannot list files for a product owned by another
 * seller (permission denied).
 *
 * This test targets permission enforcement at the file listing endpoint for
 * products:
 *
 * - Only the owner seller should be able to enumerate attached files of their
 *   product.
 * - Access by other sellers (not the product owner) must be forbidden by
 *   business rules (authorization logic).
 *
 * Test process:
 *
 * 1. Register and authenticate as seller1 (owner).
 * 2. Seller1 creates a product.
 * 3. Seller1 attaches a file to the product.
 * 4. Register and authenticate as seller2 (not owner).
 * 5. Seller2 attempts to list files for seller1's product; must fail due to
 *    permission restriction.
 * 6. The operation is validated as access denied using TestValidator.error.
 *
 * This scenario confirms seller resource isolation and proper access
 * control, ensuring that sellers cannot enumerate or interact with assets
 * not owned by them. It provides regression coverage for business-critical
 * authorization bugs and improper privilege escalation.
 */
export async function test_api_seller_product_files_list_permission_denied_for_other_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as seller1 (product/file owner)
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(seller1);

  // 2. Seller1 creates a product
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          slug: RandomGenerator.alphaNumeric(12),
          product_type: RandomGenerator.pick(["physical", "digital"] as const),
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 0,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Seller1 attaches a file to the product
  const file =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
          file_type: RandomGenerator.pick([
            "image/png",
            "image/jpeg",
            "application/pdf",
          ] as const),
          display_order: 0,
          is_primary: true,
        } satisfies IShoppingMallAiBackendProductFile.ICreate,
      },
    );
  typia.assert(file);

  // 4. Register and authenticate as seller2 (non-owner, checks isolation)
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(seller2);

  // 5. Seller2 attempts to enumerate files for seller1's product; expected to fail (permission denied)
  await TestValidator.error(
    "other sellers cannot list product files for a product they don't own",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.index(
        connection,
        {
          productId: product.id,
          body: {
            productId: product.id,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAiBackendProductFile.IRequest,
        },
      );
    },
  );
  // End of test: verifies access control for product file listing, preserves seller privacy and prevents asset enumeration by unauthorized parties.
}
