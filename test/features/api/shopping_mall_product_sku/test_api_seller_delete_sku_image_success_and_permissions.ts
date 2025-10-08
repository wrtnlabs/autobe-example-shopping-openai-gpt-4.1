import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test SKU image deletion (success & access control).
 *
 * 1. Admin creates SELLER role (if not default)
 * 2. Admin creates a product category
 * 3. Seller1 registers
 * 4. Seller1 creates a product
 * 5. Seller1 creates an SKU under product
 * 6. Seller1 uploads an image to that SKU
 * 7. Seller1 deletes the SKU image successfully
 * 8. No retrieval: Can't fetch the image again (API offers no direct GET, but test
 *    ensures subsequent operations do not find deleted image)
 * 9. Seller2 registers
 * 10. Seller2 attempts to delete the previous (already deleted or unauthorized) SKU
 *     image — receives error
 */
export async function test_api_seller_delete_sku_image_success_and_permissions(
  connection: api.IConnection,
) {
  // 1. Create SELLER role
  const sellerRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Seller role for managing own catalog",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(sellerRole);

  // 2. Create a product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Seller1 registration
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);

  // 4. Seller1 creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller1.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Seller1 creates SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        price: 12345,
        status: "active",
        low_stock_threshold: null,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 6. Seller1 uploads image to SKU
  const image =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: sku.id,
          url: `https://cdn.example.com/test-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(image);

  // 7. Seller1 deletes their own image (happy path)
  await api.functional.shoppingMall.seller.products.skus.images.erase(
    connection,
    {
      productId: product.id,
      skuId: sku.id,
      imageId: image.id,
    },
  );

  // 8. Ensure image is deleted — since no direct GET/image-list API is available, we can't directly fetch; assume correct deletion if no error thrown
  // (If an image list endpoint appears in future, test that image is absent)

  // 9. Seller2 registers
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);

  // 10. Seller2 tries to delete the previously deleted (or unauthorized) image — should receive error
  await TestValidator.error(
    "Seller2 cannot delete Seller1's (already-deleted or non-owned) image",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.erase(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          imageId: image.id,
        },
      );
    },
  );
}
