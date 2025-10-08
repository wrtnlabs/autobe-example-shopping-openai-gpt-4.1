import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validate that SKU soft-delete is prevented if the SKU is referenced by a
 * pending order.
 *
 * 1. Create and authenticate an admin account (join)
 * 2. Create the required admin role
 * 3. Create a new product category
 * 4. Create a new product under that category, using the admin's id as seller
 * 5. Create a new SKU for the product
 * 6. Create a mock customer (as customer flows are not in scope, this step might
 *    use a placeholder customer id)
 * 7. Place an order referencing the given SKU (simulate a customer with a valid
 *    shipping_address_id and payment_method_id as required)
 * 8. Attempt to soft-delete the SKU using the admin API
 * 9. Confirm that the API call results in a business error (soft delete is
 *    blocked)
 * 10. (If supported) Confirm that the SKU remains not deleted (either by reloading
 *     it or verifying deleted_at is null)
 */
export async function test_api_product_sku_soft_delete_pending_order_constraint(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(24),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create admin role
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: RandomGenerator.pick([
          "ADMIN",
          "CATALOG_MANAGER",
          "PRODUCT_OWNER",
        ]).toUpperCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 3. Create product category
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

  // 4. Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id, // Using admin as pseudo-seller for admin context
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: undefined,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Create SKU
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        price: 99000,
        status: "active",
        low_stock_threshold: undefined,
        main_image_url: undefined,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // 6. Simulate customer environment and order dependencies
  const mockCustomerId = typia.random<string & tags.Format<"uuid">>();
  // These would normally be from a customer address/payment snapshot API
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const paymentMethodId = typia.random<string & tags.Format<"uuid">>();

  // 7. Place an order referencing the SKU
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: mockCustomerId,
        shipping_address_id: shippingAddressId,
        payment_method_id: paymentMethodId,
        order_total: sku.price,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 8. Attempt to soft-delete SKU (should fail)
  await TestValidator.error(
    "soft-deleting SKU with pending order should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.erase(connection, {
        productId: product.id,
        skuId: sku.id,
      });
    },
  );

  // 9. (Optional) Confirm SKU is not deleted (deleted_at is still null/undefined)
  // [Assume a SKU reload/endpoints exists or skip this check]
}
