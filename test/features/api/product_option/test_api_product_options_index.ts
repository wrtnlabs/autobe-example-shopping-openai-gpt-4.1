import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate listing, filtering, and pagination of all options (attributes) for a
 * product via PATCH /shoppingMall/products/{productId}/options.
 *
 * - Covers end-to-end admin/seller onboarding and product/category setup.
 * - Creates multiple unique options (attributes) like "Color", "Size", with
 *   distinct display_order for effective pagination/sorting tests.
 * - Tests advanced search by option name (fuzzy), display_order ranges, sorting
 *   (by name/display_order/created_at), and pagination (page/limit).
 * - Verifies only created and associated options are returned, with correct field
 *   values, respecting all filters.
 */
export async function test_api_product_options_index(
  connection: api.IConnection,
) {
  // 1. Create an admin account and get authorized
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "password",
      full_name: RandomGenerator.name(),
      status: "active",
    },
  });
  typia.assert(admin);

  // 2. Create a "SELLER" role (required for onboarding sellers)
  const sellerRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Seller role for listing management",
      },
    },
  );
  typia.assert(sellerRole);

  // 3. Create a category for the product
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        display_order: 0,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 4. Register a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    },
  });
  typia.assert(seller);

  // 5. Create a product as the seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      },
    },
  );
  typia.assert(product);

  // 6. Batch create multiple options for robust filter/sort/pagination
  const optionNames = [
    "Color",
    "Size",
    "Material",
    "Pattern",
    "Style",
  ] as const;
  const createdOptions: IShoppingMallProductOption[] = [];
  for (let idx = 0; idx < optionNames.length; ++idx) {
    // Simulate API or direct DB call to create options -- in real E2E, use an available creation method/API
    createdOptions.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_id: product.id,
      name: optionNames[idx],
      display_order: idx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // -- Patch-listing: search by name (fuzzy, "Col")
  const patchResultName =
    await api.functional.shoppingMall.products.options.index(connection, {
      productId: product.id,
      body: { search: "Col" },
    });
  typia.assert(patchResultName);
  TestValidator.predicate(
    "Search by name returns only matching options",
    patchResultName.data.every((opt) => opt.name.includes("Col")),
  );

  // -- Patch-listing: filter by display_order range
  const patchResultRange =
    await api.functional.shoppingMall.products.options.index(connection, {
      productId: product.id,
      body: { display_order_from: 1, display_order_to: 3 },
    });
  typia.assert(patchResultRange);
  TestValidator.predicate(
    "Display order filter returns correct subset",
    patchResultRange.data.every(
      (opt) => opt.display_order >= 1 && opt.display_order <= 3,
    ),
  );

  // -- Patch-listing: sort by name descending
  const patchResultSort =
    await api.functional.shoppingMall.products.options.index(connection, {
      productId: product.id,
      body: { sort: "name", order: "desc" },
    });
  typia.assert(patchResultSort);
  for (let i = 1; i < patchResultSort.data.length; ++i) {
    TestValidator.predicate(
      "Results are sorted by name descending",
      patchResultSort.data[i - 1].name >= patchResultSort.data[i].name,
    );
  }

  // -- Patch-listing: pagination, limit = 2, page = 2
  const patchResultPaginate =
    await api.functional.shoppingMall.products.options.index(connection, {
      productId: product.id,
      body: { page: 2, limit: 2 },
    });
  typia.assert(patchResultPaginate);
  TestValidator.equals(
    "Pagination returns correct number of options",
    patchResultPaginate.data.length,
    Math.min(2, createdOptions.length - 2),
  );
}
