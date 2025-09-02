import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import type { IPageIShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteInquiry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_favorite_inquiry_list_success(
  connection: api.IConnection,
) {
  /**
   * Tests retrieval of a paginated, filtered list of customer-favorited
   * inquiries. Validates:
   *
   * - Proper setup: customer creation, favorite folder, inquiry, favorite link.
   * - Correct filtering with search/keyword and pagination settings.
   * - Result contains only expected favorite inquiries.
   * - Pagination summary fields are as expected.
   *
   * Steps:
   *
   * 1. Register and authenticate a new customer.
   * 2. Create a favorite folder for the customer.
   * 3. Create two inquiries for the customer.
   * 4. Create a favorite linked to the folder for the first inquiry.
   * 5. Link the first inquiry to the favorite.
   * 6. Fetch favorite inquiries via PATCH with filters and assert correct results.
   */

  // 1. Register and authenticate a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerPassword = "testPassword123!";
  const customerName = RandomGenerator.name();
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinRes);
  TestValidator.predicate("customer is active", joinRes.customer.is_active);

  // 2. Create a favorite folder for the customer
  const favoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(favoriteFolder);

  // 3. Create two inquiries for the customer
  const inquiryTitles = [
    RandomGenerator.paragraph({ sentences: 3 }),
    RandomGenerator.paragraph({ sentences: 3 }),
  ];
  const customerId = joinRes.customer.id;
  const inquiries = await Promise.all(
    inquiryTitles.map((title) =>
      api.functional.shoppingMallAiBackend.customer.inquiries.create(
        connection,
        {
          body: {
            customer_id: customerId, // Owner is customer
            title,
            body: RandomGenerator.content({ paragraphs: 1 }),
            private: false,
            status: "open",
          } satisfies IShoppingMallAiBackendInquiry.ICreate,
        },
      ),
    ),
  );
  inquiries.forEach((inq) => typia.assert(inq));

  // 4. Create a favorite for the first inquiry, linked to the folder
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_favorite_folder_id: favoriteFolder.id,
          target_type: "inquiry",
          title_snapshot: inquiries[0].title,
          target_id_snapshot: inquiries[0].id,
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 5. Link the first inquiry to the favorite
  const favoriteInquiry =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.createFavoriteInquiry(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favorite.id,
          shopping_mall_ai_backend_inquiry_id: inquiries[0].id,
          inquiry_snapshot: inquiries[0].title,
        } satisfies IShoppingMallAiBackendFavoriteInquiry.ICreate,
      },
    );
  typia.assert(favoriteInquiry);

  // 6. Fetch favorite inquiries with filtering, pagination, keyword search
  const request: IShoppingMallAiBackendFavoriteInquiry.IRequest = {
    page: 1,
    limit: 10,
    sort: "created_at:desc",
    search: inquiries[0].title.slice(0, 4),
  };
  const page =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.indexFavoriteInquiries(
      connection,
      {
        favoriteId: favorite.id,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "favorite inquiry page 1 returns correct entry count",
    page.data.length,
    1,
  );
  TestValidator.equals(
    "favorite inquiry returned has correct id",
    page.data[0].id,
    favoriteInquiry.id,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "favorite inquiry search matches title",
    page.data[0].inquiry_snapshot?.includes(inquiries[0].title.slice(0, 4)) ??
      false,
  );
}
