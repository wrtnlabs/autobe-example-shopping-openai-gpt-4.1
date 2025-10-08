import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the detailed retrieval of catalog product images through the public
 * image endpoint, and enforce proper business/authorization rules.
 *
 * This scenario sets up all dependencies to guarantee test repeatability and
 * includes verification of several error modes for robust coverage:
 *
 * 1. Register an admin account and authenticate to seed admin-created resources.
 * 2. Create a product category using the admin account.
 * 3. Create a seller role using the admin account.
 * 4. Register a seller account and ensure they are authenticated.
 * 5. Using the seller, create a product, setting is_active true to simulate a
 *    published item.
 * 6. Upload an image to the created product, recording the imageId.
 * 7. Use the public (unauthenticated) endpoint to fetch that image using
 *    (productId, imageId) and assert all DTO fields ( url, alt_text,
 *    display_order, created_at, and that shopping_mall_product_id matches).
 * 8. Query using the correct productId but a random, non-existent imageId—assert
 *    error.
 * 9. Query using a valid imageId, but a productId from a different product—assert
 *    error.
 * 10. Create a second product using the seller, but with is_active false. Upload an
 *     image to it, then attempt retrieval using public endpoint—assert error
 *     (unpublished products' images not accessible).
 */
export async function test_api_product_image_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies Omit<IShoppingMallCategory.ICreate, "parent_id">,
    },
  );
  typia.assert(category);

  // Step 3: Create seller role
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: RandomGenerator.paragraph({ sentences: 1 }).toUpperCase(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // Step 4: Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 5: Seller creates active (published) product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Seller uploads an image to product
  const image = await api.functional.shoppingMall.seller.products.images.create(
    connection,
    {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        url: `https://cdn.example.com/img/${RandomGenerator.alphaNumeric(8)}.jpg`,
        alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        display_order: 0,
      } satisfies IShoppingMallCatalogImage.ICreate,
    },
  );
  typia.assert(image);

  // Step 7: Retrieve image using public product API and validate all fields
  const retrieved = await api.functional.shoppingMall.products.images.at(
    connection,
    {
      productId: product.id,
      imageId: image.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("image id matches", retrieved.id, image.id);
  TestValidator.equals(
    "shopping_mall_product_id matches",
    retrieved.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("url matches", retrieved.url, image.url);
  TestValidator.equals("alt_text matches", retrieved.alt_text, image.alt_text);
  TestValidator.equals(
    "display_order matches",
    retrieved.display_order,
    image.display_order,
  );
  TestValidator.predicate("created_at exists", !!retrieved.created_at);

  // Step 8: Attempt to retrieve using non-existent imageId (expect error)
  await TestValidator.error("non-existent imageId should error", async () => {
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: product.id,
      imageId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // Step 9: Create another product, and try retrieving image with mismatched productId-imageId (expect error)
  const wrongProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(wrongProduct);
  await TestValidator.error(
    "mismatched productId-imageId should error",
    async () => {
      await api.functional.shoppingMall.products.images.at(connection, {
        productId: wrongProduct.id,
        imageId: image.id,
      });
    },
  );

  // Step 10: Create a product that is not active, upload an image, attempt retrieval (should fail)
  const unpublishedProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_active: false,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(unpublishedProduct);
  const unpublishedImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: unpublishedProduct.id,
        body: {
          shopping_mall_product_id: unpublishedProduct.id,
          url: `https://cdn.example.com/img/${RandomGenerator.alphaNumeric(8)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 0,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(unpublishedImage);
  await TestValidator.error(
    "unpublished product image should not be public",
    async () => {
      await api.functional.shoppingMall.products.images.at(connection, {
        productId: unpublishedProduct.id,
        imageId: unpublishedImage.id,
      });
    },
  );
}
