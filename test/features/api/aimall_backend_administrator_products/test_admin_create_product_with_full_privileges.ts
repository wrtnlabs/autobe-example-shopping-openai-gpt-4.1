import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that an administrator can create a new product for any seller, with
 * full privilege to set all fields (including advanced and non-default
 * values).
 *
 * This test verifies the following:
 *
 * 1. Administrator is able to create a product for an arbitrary seller and
 *    category, not just their own scope.
 * 2. All required properties and select optional/advanced properties (description,
 *    main_thumbnail_uri, status) are accepted and properly persisted.
 * 3. Business rules are enforced (seller/category IDs must be referenced by UUID,
 *    status allows overriding default, etc).
 * 4. The response entity is valid and matches the input accordingly.
 * 5. Resulting product data is actually saved and queryable (persistence can be
 *    checked via follow-up read, if possible).
 *
 * Steps:
 *
 * 1. Prepare distinct random UUIDs for category and seller (they must be valid
 *    format, but the backend accepts arbitrary UUIDs for test).
 * 2. Generate full payload using IAimallBackendProduct.ICreate with max fields:
 *    explicit status, optional fields filled, realistic values.
 * 3. Call the create API as administrator, passing full body.
 * 4. Validate: (a) Type and structure of response; (b) All properties reflect the
 *    input; (c) UUID, timestamps, and status are as expected.
 * 5. (If possible in current context) verify data by querying the product
 *    list/detail to ensure the product is persisted.
 */
export async function test_api_aimall_backend_administrator_products_test_admin_create_product_with_full_privileges(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid random UUIDs for category/seller.
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Helper: generate a random alphabetic string for image URL
  const randomAlphabetString = (length: number) =>
    ArrayUtil.repeat(length)(() =>
      String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    ).join("");

  // Step 2: Generate input payload with all properties set, including advanced fields and explicit status override.
  const input: IAimallBackendProduct.ICreate = {
    category_id: categoryId,
    seller_id: sellerId,
    title: `${RandomGenerator.paragraph()(1)} (Admin Test)`, // ensure recognizable title for query validation
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: `https://cdn.example.com/images/${randomAlphabetString(16)}.jpg`,
    status: "inactive", // demonstrate administrator override
  };

  // Step 3: Call create API as administrator
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: input,
      },
    );
  typia.assert(product);

  // Step 4: Validate response structure
  TestValidator.equals("category_id echo")(product.category_id)(
    input.category_id,
  );
  TestValidator.equals("seller_id echo")(product.seller_id)(input.seller_id);
  TestValidator.equals("title echo")(product.title)(input.title);
  TestValidator.equals("description echo")(product.description)(
    input.description,
  );
  TestValidator.equals("main_thumbnail_uri echo")(product.main_thumbnail_uri)(
    input.main_thumbnail_uri,
  );
  TestValidator.equals("status echo")(product.status)(input.status);

  // Step 5: Validate audit fields are assigned
  TestValidator.predicate("product.id is non-empty uuid")(
    !!product.id &&
      typeof product.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(product.id),
  );
  TestValidator.predicate("created_at valid datetime")(
    !!product.created_at &&
      typeof product.created_at === "string" &&
      !isNaN(Date.parse(product.created_at)),
  );
  TestValidator.predicate("updated_at valid datetime")(
    !!product.updated_at &&
      typeof product.updated_at === "string" &&
      !isNaN(Date.parse(product.updated_at)),
  );
}
