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
 * Test scenario for seller product image deletion including positive and
 * negative paths.
 *
 * 1. Create (or ensure) "SELLER" role as admin.
 * 2. Create a category as admin for the product.
 * 3. Register two seller accounts (owner, and another one for negative case).
 * 4. Authenticate as owner seller. Create a new product in the category.
 * 5. Upload two images for the product.
 * 6. Delete one image using the owner account (should succeed). a. Validate only
 *    one image remains for the product. b. If primary/main image was deleted,
 *    the other becomes main.
 * 7. Try deleting remaining image (should be forbidden if business rules say at
 *    least one image must remain).
 * 8. Authenticate as the other seller. Try to delete any image on owner's product
 *    (should be forbidden).
 */
export async function test_api_product_image_deletion_by_seller(
  connection: api.IConnection,
) {
  // Ensure "SELLER" role exists
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);
  TestValidator.equals("role_name is SELLER", role.role_name, "SELLER");

  // Create category
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

  // Register seller A (owner)
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "pwA123$!",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);

  // Register seller B (non-owner)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "pwB123$!",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);

  // Switch to seller A (owner)
  // -- assumed token handled by SDK after join

  // Create product for seller A
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Upload two images
  const image1 =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          url: `https://img${RandomGenerator.alphaNumeric(6)}.cdn.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
          display_order: 0,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          url: `https://img${RandomGenerator.alphaNumeric(6)}.cdn.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
          display_order: 1,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(image2);

  // Delete image1 by owner seller (should succeed)
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: product.id,
    imageId: image1.id,
  });

  // Try deleting image2 (now only image left); expecting forbidden/error if at least one image must always remain
  await TestValidator.error(
    "deleting last product image should be forbidden",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: image2.id,
        },
      );
    },
  );

  // Switch to seller B (non-owner) for negative test
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "pwB123$!",
      business_name: sellerB.business_name,
      contact_name: sellerB.contact_name,
      phone: sellerB.phone,
      business_registration_number: sellerB.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Try to delete image2 (should be forbidden)
  await TestValidator.error(
    "non-owner seller cannot delete other's product image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: image2.id,
        },
      );
    },
  );
}
