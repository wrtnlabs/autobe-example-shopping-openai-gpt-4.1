import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IPageIShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendInquiry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_inquiry_index_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for customer inquiry listing (pagination & search).
   *
   * This test scenario:
   *
   * 1. Registers (joins) a new customer and authenticates, using randomized input
   *    for uniqueness.
   * 2. (Skipped) Would create several inquiries as the new customer, but no
   *    inquiry-creation endpoint is available in the provided API set.
   * 3. Issues several PATCH /shoppingMallAiBackend/customer/inquiries requests to
   *    test: a) Basic pagination b) Status filtering c) Partial title searching
   *    d) Privacy filter
   *
   * At each step, asserts correct response shape, type, and filter logic, if
   * any data is returned. Note: Assertions on actual inquiry content may not
   * always trigger as no inquiries can be created in this flow.
   */

  // Step 1: Register customer and authenticate
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const phone: string = RandomGenerator.mobile();
  const password: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12) as string & tags.Format<"password">;
  const name: string = RandomGenerator.name();
  const nickname: string = RandomGenerator.name(1);

  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;
  typia.assert(customer);

  // Step 2: Skipped - no inquiry creation API

  // Step 3a: Basic paginated fetch
  const pageResult =
    await api.functional.shoppingMallAiBackend.customer.inquiries.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendInquiry.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination: current page is 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit is 10",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "inquiries: data is array",
    Array.isArray(pageResult.data),
  );
  if (pageResult.data.length > 0) {
    for (const inquiry of pageResult.data) {
      TestValidator.predicate(
        "inquiry has a valid UUID",
        typeof inquiry.id === "string" && inquiry.id.length > 0,
      );
    }
  }

  // Step 3b: Filtering by status (expecting empty array)
  const filteredResult =
    await api.functional.shoppingMallAiBackend.customer.inquiries.index(
      connection,
      {
        body: {
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.IRequest,
      },
    );
  typia.assert(filteredResult);
  if (filteredResult.data.length > 0) {
    for (const inquiry of filteredResult.data) {
      TestValidator.equals(
        "inquiry status equals filter",
        inquiry.status,
        "open",
      );
    }
  }

  // Step 3c: Search by partial title
  const searchTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const searchResult =
    await api.functional.shoppingMallAiBackend.customer.inquiries.index(
      connection,
      {
        body: {
          title: searchTitle,
        } satisfies IShoppingMallAiBackendInquiry.IRequest,
      },
    );
  typia.assert(searchResult);
  if (searchResult.data.length > 0) {
    for (const inquiry of searchResult.data) {
      TestValidator.predicate(
        "inquiry title contains or matches search substring",
        inquiry.title.includes(searchTitle) ||
          searchTitle.includes(inquiry.title),
      );
    }
  }

  // Step 3d: Privacy filter
  const privacyResult =
    await api.functional.shoppingMallAiBackend.customer.inquiries.index(
      connection,
      {
        body: {
          private: true,
        } satisfies IShoppingMallAiBackendInquiry.IRequest,
      },
    );
  typia.assert(privacyResult);
  if (privacyResult.data.length > 0) {
    for (const inquiry of privacyResult.data) {
      TestValidator.equals("privacy filter matches", inquiry.private, true);
    }
  }
}
