import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that a seller can successfully create a SKU for a product they
 * manage, with all necessary attributes enforced by the API. Also confirms that
 * unprivileged actors (e.g., customers) are blocked from creating SKUs. The
 * business context is seller-side e-commerce catalog management.
 *
 * Steps:
 *
 * 1. Create a SELLER role via admin API (ensures role existence)
 * 2. Create a product category via admin API (used by the product)
 * 3. Register a new seller account (authenticates as seller)
 * 4. Create a product for that seller, using the role and category above
 * 5. Create a SKU for the product with unique code, name, price, and status
 * 6. Validate the output SKU matches all requested attributes and product linkage
 * 7. (Negative) Attempt to use an unauthenticated connection for SKU
 *    creation—should fail
 */
export async function test_api_seller_sku_creation_valid_flow(
  connection: api.IConnection,
) {
  // 1. Ensure SELLER role exists so a seller can register
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description:
          "Marketplace seller role with product/SKU management rights.",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);
  TestValidator.equals(
    "created role name should be SELLER",
    role.role_name,
    "SELLER",
  );

  // 2. Create a product category (needed for product creation)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        description_ko: RandomGenerator.content({ paragraphs: 1 }),
        description_en: RandomGenerator.content({ paragraphs: 1 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Register a new seller
  const email: string = typia.random<string & tags.Format<"email">>();
  const brn: string = RandomGenerator.alphaNumeric(12); // Unique business number
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email,
        password: "TestPassword123!",
        business_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: brn,
        // kyc_document_uri omitted for initial registration
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);
  TestValidator.equals(
    "seller BRN matches input",
    seller.business_registration_number,
    brn,
  );
  TestValidator.equals(
    "seller approval_status is 'pending' after join",
    seller.approval_status,
    "pending",
  );

  // 4. Create a product as the registered seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Create a SKU for this product
  const skuInput = {
    sku_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    price: 19900,
    status: "active",
    low_stock_threshold: 5,
    main_image_url: null,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuInput,
    });
  typia.assert(sku);
  TestValidator.equals(
    "SKU product id matches parent product",
    sku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("SKU name matches input", sku.name, skuInput.name);
  TestValidator.equals(
    "SKU code matches input",
    sku.sku_code,
    skuInput.sku_code,
  );
  TestValidator.equals("SKU price matches input", sku.price, skuInput.price);
  TestValidator.equals("SKU status matches input", sku.status, skuInput.status);
  TestValidator.equals(
    "SKU low_stock_threshold matches input",
    sku.low_stock_threshold,
    skuInput.low_stock_threshold,
  );

  // 6. Unauthorized actor cannot create SKU
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-authenticated user cannot create SKU",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.create(
        unauthConn,
        {
          productId: product.id,
          body: skuInput,
        },
      );
    },
  );
}
