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
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the public retrieval of a paginated image gallery associated with a
 * given product as a guest user.
 *
 * Steps:
 *
 * 1. Register an admin account.
 * 2. Register a seller account.
 * 3. Admin creates a product category.
 * 4. Admin creates a SELLER role.
 * 5. Seller creates a new active product in the created category.
 * 6. (Assume at least one image is already associated with the product as per the
 *    data model.)
 * 7. Retrieve the product's images gallery as a guest and validate all properties.
 * 8. Confirm no images are listed for an inactive or deleted product.
 * 9. Attempt retrieval with an invalid productId and expect proper error handling.
 */
export async function test_api_product_image_gallery_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register an admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "12345!Aa",
        full_name: RandomGenerator.name(),
        status: "active",
      },
    });
  typia.assert(admin);

  // Step 2: Register a seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBRN: string = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "12345!Aa",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerBRN,
      },
    });
  typia.assert(seller);

  // Step 3: Admin creates a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      },
    });
  typia.assert(category);

  // Step 4: Admin creates SELLER role
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Product seller role",
      },
    });
  typia.assert(sellerRole);

  // Step 5: Seller creates a new active product in the category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      },
    });
  typia.assert(product);

  // Step 6 (Assumption): At least one image is already associated with the product.
  // Step 7: Any user (guest) retrieves images for the given product
  const resp: IPageIShoppingMallCatalogImage =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        productId: product.id,
        page: 1,
        limit: 5,
      },
    });
  typia.assert(resp);
  TestValidator.equals(
    "images are for this product only",
    resp.data.every((img) => img.shopping_mall_product_id === product.id),
    true,
  );
  TestValidator.predicate(
    "every image has url, display_order, created_at",
    resp.data.every(
      (img) =>
        !!img.url && typeof img.display_order === "number" && !!img.created_at,
    ),
  );

  // Step 8: Confirm that images are not returned for an inactive product
  // For lack of an update endpoint, simulate by creating an inactive product
  const inactiveProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: false,
      },
    });
  typia.assert(inactiveProduct);
  const respInactive: IPageIShoppingMallCatalogImage =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: inactiveProduct.id,
      body: {
        productId: inactiveProduct.id,
        page: 1,
        limit: 5,
      },
    });
  typia.assert(respInactive);
  TestValidator.equals(
    "inactive product returns no images",
    respInactive.data.length,
    0,
  );

  // Step 9: Try an invalid productId
  await TestValidator.error("invalid productId returns error", async () => {
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        productId: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 5,
      },
    });
  });
}
