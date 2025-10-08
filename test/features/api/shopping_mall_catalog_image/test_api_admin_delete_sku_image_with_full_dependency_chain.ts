import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test full dependency chain for deleting a SKU image (admin privileges
 * required).
 *
 * 1. Admin authenticates by joining
 * 2. Admin creates a new root category
 * 3. Admin creates a product under that category
 * 4. Admin creates a SKU for that product
 * 5. Admin uploads (creates) a SKU image
 * 6. Admin deletes the image (valid case)
 * 7. Attempt to delete the same image again (should error)
 * 8. Attempt to delete a non-existent (random) imageId (should error)
 * 9. Attempt to delete with mismatched productId/skuId/imageId (should error)
 */
export async function test_api_admin_delete_sku_image_with_full_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a root category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(3),
        name_en: RandomGenerator.name(3),
        description_ko: RandomGenerator.paragraph({ sentences: 5 }),
        description_en: RandomGenerator.paragraph({ sentences: 5 }),
        is_active: true,
        parent_id: undefined,
        display_order: 0,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Admin creates a product in the category (admin acts as seller and must set seller id to own id)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create a SKU for the product
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        price: 9990,
        status: "active",
        low_stock_threshold: 5,
        main_image_url: null,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // 5. Create (upload) a catalog image for the SKU
  const image: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.admin.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: sku.id,
          url: `https://cdn.example.com/img/${RandomGenerator.alphaNumeric(16)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(image);

  // 6. Delete the catalog image (happy path)
  await api.functional.shoppingMall.admin.products.skus.images.erase(
    connection,
    {
      productId: product.id,
      skuId: sku.id,
      imageId: image.id,
    },
  );

  // 7. Attempt to delete the same image again (should fail)
  await TestValidator.error("delete sku image again should fail", async () => {
    await api.functional.shoppingMall.admin.products.skus.images.erase(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        imageId: image.id,
      },
    );
  });

  // 8. Attempt to delete a random bogus image id for this SKU/product (should fail)
  await TestValidator.error(
    "delete sku image bogus imageId should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.images.erase(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 9. Attempt to delete with mismatched productId/skuId (should fail)
  // (A) Wrong productId
  await TestValidator.error(
    "delete sku image with wrong productId",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.images.erase(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          skuId: sku.id,
          imageId: image.id,
        },
      );
    },
  );
  // (B) Wrong skuId
  await TestValidator.error("delete sku image with wrong skuId", async () => {
    await api.functional.shoppingMall.admin.products.skus.images.erase(
      connection,
      {
        productId: product.id,
        skuId: typia.random<string & tags.Format<"uuid">>(),
        imageId: image.id,
      },
    );
  });
}
