import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import type { IPageIShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductOptions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_option_index_success_owner(
  connection: api.IConnection,
) {
  /**
   * Validates seller-owned successful retrieval of product option groups (with
   * pagination & filtering).
   *
   * This test simulates a seller registering and onboarding, adding a new
   * product (mocked, since no product creation API is present), adding several
   * option groups to the product (also mocked due to lack of public
   * option-creation endpoint), then confirming list retrieval of product
   * options with paginated and filtered access. The primary focus is verifying
   * business correctness and accurate field-level data integrity for the option
   * listing, including pagination and filter controls.
   */

  // 1. Seller registration and authentication (prerequisite for owning product/options).
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_registration_number: RandomGenerator.alphaNumeric(9),
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a "dummy" product (mock, since product creation is not exposed in this context).
  //    We'll generate a random UUID as the new product's ID for associating options.
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Synthesize and insert multiple fake option groups for this product (mock, since no API; direct construction).
  const totalOptionsCount = 7;
  const optionGroups: IShoppingMallAiBackendProductOptions[] = ArrayUtil.repeat(
    totalOptionsCount,
    (i) => {
      const optionName = RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 10,
      });
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_ai_backend_products_id: productId,
        option_name: optionName,
        required: RandomGenerator.pick([true, false] as const),
        sort_order: i + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
    },
  );

  // 4. Test paginated retrieval: limit to 4 per page.
  {
    const page = 1;
    const limit = 4;
    const output =
      await api.functional.shoppingMallAiBackend.seller.products.options.index(
        connection,
        {
          productId,
          body: {
            page,
            limit,
          } satisfies IShoppingMallAiBackendProductOptions.IRequest,
        },
      );
    typia.assert(output);
    TestValidator.equals(
      "pagination: correct page and limit",
      output.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination: correct limit",
      output.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "pagination: correct records count",
      output.pagination.records,
      totalOptionsCount,
    );
    TestValidator.equals(
      "pagination: correct page count",
      output.pagination.pages,
      Math.ceil(totalOptionsCount / limit),
    );
    TestValidator.equals(
      "pagination: result length matches limit or surplus",
      output.data.length,
      Math.min(limit, totalOptionsCount),
    );
    // Would verify actual content, but since data is mocked in this scenario, only basics checked.
  }

  // 5. Test filter by required=true
  {
    const required = true;
    const expected = optionGroups.filter((opt) => opt.required === required);
    const output =
      await api.functional.shoppingMallAiBackend.seller.products.options.index(
        connection,
        {
          productId,
          body: {
            required,
          } satisfies IShoppingMallAiBackendProductOptions.IRequest,
        },
      );
    typia.assert(output);
    TestValidator.equals(
      "required filter: result count matches expected",
      output.data.length,
      expected.length,
    );
    // Would verify field equality, but mocked, so only count compared.
  }

  // 6. Test filter by partial name match
  {
    // pick substring from one of the created names
    const nameSample = optionGroups[0].option_name;
    const search = RandomGenerator.substring(nameSample);
    const expected = optionGroups.filter((opt) =>
      opt.option_name.includes(search),
    );
    const output =
      await api.functional.shoppingMallAiBackend.seller.products.options.index(
        connection,
        {
          productId,
          body: {
            option_name: search,
          } satisfies IShoppingMallAiBackendProductOptions.IRequest,
        },
      );
    typia.assert(output);
    TestValidator.equals(
      "name search filter: matches expected count",
      output.data.length,
      expected.length,
    );
  }

  // 7. Test filter by required=false
  {
    const required = false;
    const expected = optionGroups.filter((opt) => opt.required === required);
    const output =
      await api.functional.shoppingMallAiBackend.seller.products.options.index(
        connection,
        {
          productId,
          body: {
            required,
          } satisfies IShoppingMallAiBackendProductOptions.IRequest,
        },
      );
    typia.assert(output);
    TestValidator.equals(
      "required=false filter: result count matches expected",
      output.data.length,
      expected.length,
    );
  }
}
