import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_get_success_owner(
  connection: api.IConnection,
) {
  /**
   * Test the retrieval of a specific product's option group (owned by the
   * authenticated seller).
   *
   * Business context: A seller must be able to retrieve details of the option
   * groups they have defined for their own products. This ensures sellers can
   * view/manage product variants (such as size, color groups) as needed in the
   * seller dashboard and product management UI. Steps:
   *
   * 1. Register as a seller (using /auth/seller/join with realistic random data)
   * 2. (Normally: create a product and an option group, but these endpoints are
   *    not provided—so option can only be assumed and random IDs are used)
   * 3. Attempt to retrieve product option details using the at() API function with
   *    known/random productId and optionId
   * 4. Assert that returned option group matches the structure and requested IDs
   * 5. Validate all required structural and field values in the response
   */
  // Step 1: Register and login as seller to ensure authorization context
  const sellerCreate: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerCreate });
  typia.assert(sellerAuth);

  // Step 2: (Normally: create the product and option group, but endpoints missing—use random IDs)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const optionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to get the product option group as the seller
  const optionGroup: IShoppingMallAiBackendProductOptions =
    await api.functional.shoppingMallAiBackend.seller.products.options.at(
      connection,
      {
        productId,
        optionId,
      },
    );
  typia.assert(optionGroup);

  // Step 4: Validate the returned option group fields
  TestValidator.equals(
    "product option group: productId matches",
    optionGroup.shopping_mall_ai_backend_products_id,
    productId,
  );
  TestValidator.equals(
    "product option group: optionId matches",
    optionGroup.id,
    optionId,
  );
  TestValidator.predicate(
    "option group: option_name nonempty string",
    typeof optionGroup.option_name === "string" &&
      optionGroup.option_name.length > 0,
  );
  TestValidator.predicate(
    "option group: required field is boolean",
    typeof optionGroup.required === "boolean",
  );
  TestValidator.predicate(
    "option group: sort_order is integer",
    Number.isInteger(optionGroup.sort_order),
  );
  TestValidator.predicate(
    "option group: created_at has ISO date format",
    typeof optionGroup.created_at === "string" &&
      optionGroup.created_at.includes("T"),
  );
  TestValidator.predicate(
    "option group: updated_at has ISO date format",
    typeof optionGroup.updated_at === "string" &&
      optionGroup.updated_at.includes("T"),
  );
  if ("deleted_at" in optionGroup)
    TestValidator.predicate(
      "option group: deleted_at is string or null if present",
      optionGroup.deleted_at === null ||
        (typeof optionGroup.deleted_at === "string" &&
          optionGroup.deleted_at.includes("T")),
    );
}
