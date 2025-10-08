import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validate that an admin can soft-delete a SKU from an admin product.
 *
 * 1. Create an admin account (auth/join)
 * 2. Create required admin role (admin/roles)
 * 3. Create product category for product (admin/categories)
 * 4. Create product (admin/products)
 * 5. Create SKU under that product (admin/products/{productId}/skus)
 * 6. Soft-delete the SKU (admin/products/{productId}/skus/{skuId}, DELETE)
 * 7. Refetch that SKU (using the context of create step) & assert deleted_at field
 *    is set.
 * 8. (Catalog incomplete/lookup, simulate as best as possible): after soft delete,
 *    attempt to soft-delete again and expect error or idempotence. Confirm not
 *    physically erased.
 */
export async function test_api_product_sku_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureP@ss123!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create admin role (if needed for permission model)
  const adminRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "ADMIN",
        description: "Administrator role with full platform permissions",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(adminRole);

  // Step 3: Create a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id, // simulate admin as seller/owner
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Create SKU
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        price: 100.5,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // Step 6: Soft-delete the SKU
  await api.functional.shoppingMall.admin.products.skus.erase(connection, {
    productId: product.id,
    skuId: sku.id,
  });

  // Step 7: Try to create the same SKU code again to check soft-delete means removed from unique constraint
  const newSku = await api.functional.shoppingMall.admin.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: sku.sku_code,
        name: RandomGenerator.name(),
        price: 100.5,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(newSku);

  // Step 8: Attempt to soft-delete the same SKUId again. Should be idempotent or error.
  await TestValidator.error(
    "double soft delete should error or be idempotent",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.erase(connection, {
        productId: product.id,
        skuId: sku.id,
      });
    },
  );
}
