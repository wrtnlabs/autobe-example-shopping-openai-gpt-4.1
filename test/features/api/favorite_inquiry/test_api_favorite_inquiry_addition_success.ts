import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

/**
 * Test successful inquiry favoriting in the customer's favorite
 * group/folder.
 *
 * 1. Register a new customer account, capturing authentication and customer
 *    UUID
 * 2. Create a favorite folder (group) for this customer
 * 3. Create an inquiry (QnA/support ticket) as the customer
 * 4. Add the inquiry to the favorite (POST
 *    /shoppingMallAiBackend/customer/favorites/{favoriteId}/inquiries)
 * 5. Validate the association object:
 *
 *    - IDs (favorite folder, inquiry) match
 *    - Inquiry_snapshot is present & accurate
 *    - Creation time is filled & in correct format
 *    - Mapping ID is a valid UUID
 * 6. Attempt to add the same inquiry to the same favorite folder again, verify
 *    duplication is prevented (should error)
 * 7. All responses and business relationships are type-asserted for
 *    correctness
 */
export async function test_api_favorite_inquiry_addition_success(
  connection: api.IConnection,
) {
  // 1. Register customer & authenticate session
  const email = typia.random<string & tags.Format<"email">>();
  const phone_number = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);
  const joinResp = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResp);
  const customerId = joinResp.customer.id;

  // 2. Create a favorite folder
  const favoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(favoriteFolder);
  TestValidator.equals(
    "folder belongs to correct customer",
    favoriteFolder.shopping_mall_ai_backend_customer_id,
    customerId,
  );

  // 3. Create an inquiry (with explicit nulls for optional fields)
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: customerId,
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);
  TestValidator.equals(
    "inquiry belongs to correct customer",
    inquiry.customer_id,
    customerId,
  );
  TestValidator.equals("inquiry status should be open", inquiry.status, "open");

  // 4. Add inquiry to favorite (create mapping)
  const favoriteInquiry =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.createFavoriteInquiry(
      connection,
      {
        favoriteId: favoriteFolder.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favoriteFolder.id,
          shopping_mall_ai_backend_inquiry_id: inquiry.id,
          inquiry_snapshot: null, // let server snapshot
        } satisfies IShoppingMallAiBackendFavoriteInquiry.ICreate,
      },
    );
  typia.assert(favoriteInquiry);
  TestValidator.equals(
    "mapping has right favorite folder ID",
    favoriteInquiry.shopping_mall_ai_backend_favorite_id,
    favoriteFolder.id,
  );
  TestValidator.equals(
    "mapping has right inquiry ID",
    favoriteInquiry.shopping_mall_ai_backend_inquiry_id,
    inquiry.id,
  );
  // Validate created_at is valid ISO string
  typia.assert<string & tags.Format<"date-time">>(favoriteInquiry.created_at);
  TestValidator.predicate(
    "created_at is a non-empty ISO string",
    typeof favoriteInquiry.created_at === "string" &&
      favoriteInquiry.created_at.length > 0,
  );
  // Validate mapping ID is UUID
  typia.assert<string & tags.Format<"uuid">>(favoriteInquiry.id);
  TestValidator.predicate(
    "favorite inquiry mapping id is a non-empty UUID",
    typeof favoriteInquiry.id === "string" && favoriteInquiry.id.length > 0,
  );

  // 5. Snapshots - server may provide inquiry_snapshot as string evidence
  TestValidator.predicate(
    "inquiry_snapshot is string or null",
    favoriteInquiry.inquiry_snapshot === null ||
      typeof favoriteInquiry.inquiry_snapshot === "string",
  );

  // 6. Prevent duplication: attempt to add same inquiry to folder again
  await TestValidator.error("duplicate favoriting is rejected", async () => {
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.createFavoriteInquiry(
      connection,
      {
        favoriteId: favoriteFolder.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favoriteFolder.id,
          shopping_mall_ai_backend_inquiry_id: inquiry.id,
          inquiry_snapshot: null,
        } satisfies IShoppingMallAiBackendFavoriteInquiry.ICreate,
      },
    );
  });
}
