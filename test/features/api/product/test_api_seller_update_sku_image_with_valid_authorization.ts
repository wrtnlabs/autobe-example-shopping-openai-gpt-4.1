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
 * Validate seller can successfully update a SKU image's metadata, and that only
 * the owner seller can do this operation, not another seller or a customer.
 * Full workflow: admin joins (for RBAC setup), creates category & seller role,
 * seller registers, creates product/SKU, uploads image, updates image,
 * validates update, also negative checks for other roles.
 */
export async function test_api_seller_update_sku_image_with_valid_authorization(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPwd = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPwd,
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create product category as admin
  const categoryCreate = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    description_ko: RandomGenerator.paragraph(),
    description_en: RandomGenerator.paragraph(),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 3. Create seller role as admin
  const sellerRoleCreate = {
    role_name: "SELLER",
    description: "Can manage products and SKUs",
  } satisfies IShoppingMallRole.ICreate;
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: sellerRoleCreate,
    });
  typia.assert(sellerRole);

  // 4. Register a seller & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPwd = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPwd,
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(12),
        kyc_document_uri: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 5. Seller creates a product
  const productCreate = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 6. Seller creates SKU for product
  const skuCreate = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    price: 7000,
    status: "active",
    main_image_url: null,
    low_stock_threshold: 10,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert(sku);

  // 7. Seller uploads an image for the SKU
  const imageCreate = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
    url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(16) + ".jpg",
    alt_text: RandomGenerator.paragraph(),
    display_order: 0,
  } satisfies IShoppingMallCatalogImage.ICreate;
  const image: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: imageCreate,
      },
    );
  typia.assert(image);

  // 8. Seller updates the image metadata (change alt_text & display_order)
  const newAltText = RandomGenerator.paragraph({ sentences: 2 });
  const newDisplayOrder = 1;
  const imageUpdate = {
    alt_text: newAltText,
    display_order: newDisplayOrder,
  } satisfies IShoppingMallCatalogImage.IUpdate;
  const updatedImage: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.skus.images.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        imageId: image.id,
        body: imageUpdate,
      },
    );
  typia.assert(updatedImage);
  TestValidator.equals(
    "image alt_text updated",
    updatedImage.alt_text,
    newAltText,
  );
  TestValidator.equals(
    "image display_order updated",
    updatedImage.display_order,
    newDisplayOrder,
  );

  // 9. Attempt to update as another seller - expect error
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      kyc_document_uri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  await TestValidator.error("other seller cannot update image", async () => {
    await api.functional.shoppingMall.seller.products.skus.images.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        imageId: image.id,
        body: {
          display_order: 99,
        } satisfies IShoppingMallCatalogImage.IUpdate,
      },
    );
  });

  // 10. Attempt to update as customer (negative coverage)
  // Edge: simulate customer context by not providing any seller auth token (connection is intentionally not authenticated as seller)
  // Here, since customer authentication and endpoints are not provided, simulate unauthenticated (or a "bare" connection) error case
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "customer/unauthenticated cannot update image",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.update(
        unauthConn,
        {
          productId: product.id,
          skuId: sku.id,
          imageId: image.id,
          body: {
            alt_text: "forbidden",
          } satisfies IShoppingMallCatalogImage.IUpdate,
        },
      );
    },
  );
}
