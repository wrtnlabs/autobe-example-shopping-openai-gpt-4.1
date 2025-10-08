import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller-side product image upload API.
 *
 * 1. Create admin role SELLER (admin endpoint is required for RBAC completeness)
 * 2. Create a new category that product will reside in (admin only)
 * 3. Create/register a seller account via join endpoint
 * 4. Seller creates a new product, linked to the new category
 * 5. Seller uploads a catalog image for this product
 * 6. Validate image upload succeeded, proper product linkage, correct metadata,
 *    and API result contract
 */
export async function test_api_product_image_upload_by_seller(
  connection: api.IConnection,
) {
  // 1. Create SELLER role if not exists
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Seller role for managing personal products and catalogs",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(sellerRole);

  // 2. Create a category for the product
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Seller registration (join/signup)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SecurePassword123!",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 4. Seller creates a new product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 15,
          sentenceMax: 20,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Upload a new image for this product
  const imageBody = {
    shopping_mall_product_id: product.id,
    url: `https://cdn.example.com/catalog/${RandomGenerator.alphaNumeric(24)}.jpg`,
    display_order: 0,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallCatalogImage.ICreate;

  const image: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: imageBody,
      },
    );
  typia.assert(image);

  // 6. Validate returned image info
  TestValidator.equals(
    "uploaded image is linked to the right product",
    image.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "uploaded image url is preserved",
    image.url,
    imageBody.url,
  );
  TestValidator.equals(
    "uploaded image display_order correct",
    image.display_order,
    imageBody.display_order,
  );
  if (imageBody.alt_text) {
    TestValidator.equals(
      "alt_text is reflected",
      image.alt_text,
      imageBody.alt_text,
    );
  }
  TestValidator.predicate(
    "response has valid uuid for image id",
    typeof image.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        image.id,
      ),
  );
  TestValidator.predicate(
    "response has valid created_at timestamp",
    typeof image.created_at === "string" && image.created_at.length > 0,
  );
}
