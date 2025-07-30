import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate enforcement of referential integrity when deleting a SKU.
 *
 * This test attempts to delete a SKU that is referenced by another entity (cart
 * item), verifying that the API prevents deletion when dependency constraints
 * exist (e.g., foreign key).
 *
 * **Test Workflow:**
 *
 * 1. Create a product (required for SKU creation and cart item linkage).
 * 2. Create a SKU that belongs to this product.
 * 3. Create a cart (admin can create without customer_id/session_token).
 * 4. Add a cart item to the cart, referencing BOTH the product and SKU.
 * 5. Attempt to delete the SKU; verify that deletion fails due to foreign key
 *    (dependency) constraint by expecting error.
 *
 * **Business Context:** Ensures that the API prevents deletion of SKUs in use,
 * protecting referential integrity and preventing orphan records. This is
 * critical for compliance and reliability of transactional entities referencing
 * catalog data.
 */
export async function test_api_aimall_backend_administrator_skus_test_delete_sku_with_foreign_key_constraint(
  connection: api.IConnection,
) {
  // 1. Create the product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU linked to the product
  const sku = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(10),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 3. Create a new cart (anonymous/admin)
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {} satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 4. Add a cart item referencing both the product and SKU
  const cartItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: product.id,
          aimall_backend_product_option_id: undefined,
          aimall_backend_sku_id: sku.id,
          quantity: 1,
          unit_price_snapshot: typia.random<number>(),
          discount_snapshot: null,
          selected_name_display: null,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 5. Attempt to delete the SKU and expect an error due to referential integrity
  await TestValidator.error(
    "should prevent deletion when SKU is referenced by cart item",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.erase(connection, {
      skuId: sku.id,
    });
  });
}
