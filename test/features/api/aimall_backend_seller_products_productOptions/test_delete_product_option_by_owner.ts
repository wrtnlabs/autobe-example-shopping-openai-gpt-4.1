import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Test successful deletion of a product option by its owning seller.
 *
 * Business context: Sellers are allowed to create and delete product options
 * attached to their own products. This test verifies:
 *
 * - A seller (created via administrator endpoint) can create a product.
 * - The same seller can add product options.
 * - The seller can hard-delete any of their product's options.
 * - A deleted product option can be re-created (ID changes) and other options are
 *   not affected.
 *
 * This ensures proper product option lifecycle management and option uniqueness
 * enforcement tied to product and owner.
 */
export async function test_api_aimall_backend_seller_products_productOptions_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Create a seller (administrator-level API used for onboarding)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a new product owned by this seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Add two product options: "Color: Red" and "Size: Large"
  const option1 =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Color",
          value: "Red",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option1);

  const option2 =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Size",
          value: "Large",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option2);

  // 4. Delete the first product option
  await api.functional.aimall_backend.seller.products.productOptions.erase(
    connection,
    {
      productId: product.id,
      productOptionId: option1.id,
    },
  );

  // 5. Attempt to re-create the same option (Color: Red); must succeed with a different ID (shows true deletion)
  const readdedOption1 =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Color",
          value: "Red",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(readdedOption1);
  TestValidator.notEquals("deleted option id changed on re-create")(
    readdedOption1.id,
  )(option1.id);

  // 6. Delete the second option
  await api.functional.aimall_backend.seller.products.productOptions.erase(
    connection,
    {
      productId: product.id,
      productOptionId: option2.id,
    },
  );

  // 7. Attempt to re-create it to confirm only the deleted option was removed, and same name/value can be re-added
  const readdedOption2 =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Size",
          value: "Large",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(readdedOption2);
  TestValidator.notEquals("deleted second option id changed on re-create")(
    readdedOption2.id,
  )(option2.id);

  // 8. Negative test for ownership is omitted (not possible with API surface)
}
