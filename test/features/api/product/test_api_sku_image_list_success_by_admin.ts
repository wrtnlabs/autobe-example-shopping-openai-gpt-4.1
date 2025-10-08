import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an authenticated admin can list all catalog images for a SKU,
 * regardless of ownership.
 *
 * Steps:
 *
 * 1. Admin joins (register admin)
 * 2. Admin creates a category
 * 3. Seller joins (register seller)
 * 4. Seller creates a product in the category
 * 5. Seller creates a SKU under the product
 * 6. Seller uploads two images for the SKU
 * 7. Admin lists all images for the SKU using the advanced index endpoint with
 *    pagination, filtering and sorting
 * 8. Validate that only images for the SKU are returned (no leakage from other
 *    SKUs)
 * 9. Validate all image metadata matches what was uploaded
 */
export async function test_api_sku_image_list_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongP@ssw0rd!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a category
  const categoryInput = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);

  // 3. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerP@ss1!",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 4. Seller creates a product
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerP@ss1!",
      business_name: seller.business_name,
      contact_name: seller.contact_name,
      phone: seller.phone,
      business_registration_number: seller.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // (Token auto-handled)

  const productInput = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 5. Seller creates a SKU
  const skuInput = {
    sku_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    price: Math.floor(Math.random() * 10000) + 500,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuInput,
    });
  typia.assert(sku);

  // 6. Seller uploads two images for the SKU
  const imageInputs = ArrayUtil.repeat(
    2,
    (i) =>
      ({
        shopping_mall_product_id: product.id,
        shopping_mall_product_sku_id: sku.id,
        url: `https://cdn.example.com/skus/${sku.id}/image${i}.jpg`,
        alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        display_order: i,
      }) satisfies IShoppingMallCatalogImage.ICreate,
  );
  const images: IShoppingMallCatalogImage[] = [];
  for (let i = 0; i < imageInputs.length; ++i) {
    const img =
      await api.functional.shoppingMall.seller.products.skus.images.create(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: imageInputs[i],
        },
      );
    typia.assert(img);
    images.push(img);
  }

  // 7. Admin lists all images for the SKU (advanced search with skuId filter)
  // (re-authenticate as admin for clarity; connection should allow it automatically)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd!",
      full_name: admin.full_name,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const pageInput = {
    productId: product.id,
    skuId: sku.id,
    sortBy: "display_order",
    sortDir: "asc",
    page: 1,
    limit: 5,
  } satisfies IShoppingMallCatalogImage.IRequest;
  const page: IPageIShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: pageInput,
      },
    );
  typia.assert(page);

  // 8. Validate that only images for this SKU are present
  TestValidator.predicate(
    "every catalog image belongs to the specified SKU",
    page.data.every((img) => img.shopping_mall_product_sku_id === sku.id),
  );

  // 9. Validate all image metadata matches what was uploaded
  TestValidator.equals(
    "uploaded images returned as expected, sorted by display_order",
    page.data.map((x) => ({ url: x.url, display_order: x.display_order })),
    images.map((x) => ({ url: x.url, display_order: x.display_order })),
  );
}
