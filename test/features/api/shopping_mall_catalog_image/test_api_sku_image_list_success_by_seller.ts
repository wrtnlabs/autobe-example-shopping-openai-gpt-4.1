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
 * Successful paginated & filtered image listing for a SKU by seller.
 *
 * 1. Authenticate as admin (for category creation)
 * 2. Create a product category as admin
 * 3. Authenticate as a seller (register seller)
 * 4. Create a product under the created category as the seller
 * 5. Create a SKU variant for the product
 * 6. Upload at least one image to the SKU
 * 7. List images for that SKU with no filters
 * 8. List images with filters: pagination, sort by display_order and created_at,
 *    and confirm data
 * 9. Verify all retrieved images belong to the SKU and seller; irrelevant images
 *    excluded; pagination/metas/fields correct
 */
export async function test_api_sku_image_list_success_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create product category as admin
  const categoryBody = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryBody,
    },
  );
  typia.assert(category);

  // 3. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // 4. Seller creates product
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);

  // 5. Seller creates SKU
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(1),
    price: 1000,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuBody,
    },
  );
  typia.assert(sku);

  // 6. Upload images to SKU (create 3 images, some with different display_order)
  const numImages = 3;
  const images: IShoppingMallCatalogImage[] = [];
  for (let i = 0; i < numImages; ++i) {
    const imgBody = {
      shopping_mall_product_id: product.id,
      shopping_mall_product_sku_id: sku.id,
      url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
      alt_text: RandomGenerator.paragraph({ sentences: 2 }),
      display_order: i,
    } satisfies IShoppingMallCatalogImage.ICreate;
    const img =
      await api.functional.shoppingMall.seller.products.skus.images.create(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: imgBody,
        },
      );
    typia.assert(img);
    images.push(img);
  }

  // 7. List images with NO filters (should get all images for SKU)
  const allRes =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {},
      },
    );
  typia.assert(allRes);
  TestValidator.equals(
    "pagination limit matches default or result count",
    allRes.data.length,
    numImages,
  );
  for (const img of allRes.data) {
    TestValidator.equals(
      "image is for correct SKU",
      img.shopping_mall_product_sku_id,
      sku.id,
    );
    TestValidator.equals(
      "image is for correct product",
      img.shopping_mall_product_id,
      product.id,
    );
    TestValidator.predicate(
      "url is not empty",
      typeof img.url === "string" && !!img.url,
    );
    TestValidator.predicate(
      "display_order is valid",
      typeof img.display_order === "number" && img.display_order >= 0,
    );
    TestValidator.predicate(
      "created_at is valid ISO string",
      /^\d{4}-\d{2}-\d{2}T/.test(img.created_at),
    );
  }

  // 8. List images with filters (pagination, sort by display_order desc)
  const pagedRes =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: { page: 1, limit: 2, sortBy: "display_order", sortDir: "desc" },
      },
    );
  typia.assert(pagedRes);
  TestValidator.predicate(
    "pagination not exceeding limit",
    pagedRes.data.length <= 2,
  );
  let sorted = [...pagedRes.data].sort(
    (a, b) => b.display_order - a.display_order,
  );
  TestValidator.equals("ordering by display_order desc", pagedRes.data, sorted);

  // 9. List images with filters (sort by created_at asc)
  const createdAtRes =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: { sortBy: "created_at", sortDir: "asc" },
      },
    );
  typia.assert(createdAtRes);
  sorted = [...createdAtRes.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  TestValidator.equals("ordering by created_at asc", createdAtRes.data, sorted);

  // 10. Negative check: try to fetch images for an unrelated SKU (should return 0)
  const fakeSkuId = typia.random<string & tags.Format<"uuid">>();
  const notFoundRes =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: fakeSkuId,
        body: {},
      },
    );
  typia.assert(notFoundRes);
  TestValidator.equals("no data for unrelated SKU", notFoundRes.data.length, 0);
}
