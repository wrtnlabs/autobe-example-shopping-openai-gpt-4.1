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
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test uploading (associating) a new image to a seller's product SKU.
 *
 * 1. Register an admin and create required system entities (role, category).
 * 2. Register a seller account (with basics: email, password, business name,
 *    contact, phone, business_registration_number).
 * 3. Seller creates a product (with link to the created category).
 * 4. Seller creates a SKU variant for the product.
 * 5. Seller uploads (associates) a new image to that SKU using proper metadata
 *    (valid url, optional alt_text, display_order).
 * 6. Validate that the response contains a catalog image record (with an id, url,
 *    display order, proper association to SKU and product).
 * 7. Error scenario: unauthenticated or unauthorized upload attempt is rejected.
 * 8. Error scenario: invalid image parameters (overly long URL, negative
 *    display_order) should fail with error. Note: Image upload does not mean
 *    raw file transfer but association with a URL. This simulates post-upload
 *    attachment.
 */
export async function test_api_sku_image_upload_by_seller(
  connection: api.IConnection,
) {
  // Admin setup: join, add seller role, and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "testadmin1234",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const sellerRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Seller role for e-commerce platform",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(sellerRole);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Seller account creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "testpassword1",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Seller creates a product in the created category
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Seller creates a SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        price: 12345,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // Seller uploads/associates an image to the SKU
  const imageBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
    url: typia.random<string & tags.MaxLength<80000>>(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 0,
  } satisfies IShoppingMallCatalogImage.ICreate;

  const catalogImage =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: imageBody,
      },
    );
  typia.assert(catalogImage);
  TestValidator.equals(
    "sku image is associated to correct SKU",
    catalogImage.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "sku image is associated to correct product",
    catalogImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "sku image URL matches",
    catalogImage.url,
    imageBody.url,
  );
  if (imageBody.alt_text)
    TestValidator.equals(
      "sku image alt text matches",
      catalogImage.alt_text,
      imageBody.alt_text,
    );
  TestValidator.equals(
    "sku image display order matches",
    catalogImage.display_order,
    imageBody.display_order,
  );

  // Error: unauthenticated (remove headers) should be refused
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated seller cannot upload sku image",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.create(
        unauthConn,
        {
          productId: product.id,
          skuId: sku.id,
          body: imageBody,
        },
      );
    },
  );

  // Error: invalid display_order
  const badImageBodyNegOrder = {
    ...imageBody,
    display_order: -1,
  } satisfies IShoppingMallCatalogImage.ICreate;
  await TestValidator.error(
    "upload with negative display_order is rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.create(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: badImageBodyNegOrder,
        },
      );
    },
  );

  // Error: overly long URL (>80000 chars)
  const longUrl =
    "https://cdn.example.com/" + RandomGenerator.alphaNumeric(80005);
  const badImageBodyLongUrl = {
    ...imageBody,
    url: longUrl,
  } satisfies IShoppingMallCatalogImage.ICreate;
  await TestValidator.error(
    "upload with overly long url is rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.create(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: badImageBodyLongUrl,
        },
      );
    },
  );
}
