import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import type { IPageIShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerExternalIdentity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the retrieval of a customer's external identity list by an
 * authenticated admin.
 *
 * 1. Register a new admin account for authentication (admin join).
 * 2. Register a new customer user (customer join).
 * 3. As admin, get the external identity list for the customer using PATCH
 *    /shoppingMallAiBackend/admin/customers/{customerId}/externalIdentities.
 *
 *    - Send a body with basic search/pagination.
 *    - Validate the response contains a valid page object.
 *    - If any external identities are present, verify required fields like
 *         provider, id, linked_at.
 */
export async function test_api_admin_customer_external_identities_list_success(
  connection: api.IConnection,
) {
  // 1. Register new admin for authentication
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@mall-admin.com";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(2),
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // 2. Register a customer account
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerEmail = RandomGenerator.alphaNumeric(8) + "@mall-user.com";
  const customerPhone = RandomGenerator.mobile();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      phone_number: customerPhone,
      password: customerPassword as string & tags.Format<"password">,
      name: RandomGenerator.name(2),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 3. As admin, request external identity list for the customer
  const page =
    await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.index(
      connection,
      {
        customerId: customerJoin.customer.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IShoppingMallAiBackendCustomerExternalIdentity.IRequest,
      },
    );
  typia.assert(page);
  // General page structure validation
  TestValidator.predicate(
    "pagination current page == 1",
    page.pagination.current === 1,
  );
  TestValidator.equals("pagination page size == 10", page.pagination.limit, 10);
  // If there are external identities, check required fields
  if (page.data.length > 0) {
    page.data.forEach((identity, idx) => {
      TestValidator.predicate(
        `identity[${idx}] has provider`,
        typeof identity.provider === "string" && identity.provider.length > 0,
      );
      TestValidator.predicate(
        `identity[${idx}] has id`,
        typeof identity.id === "string" && identity.id.length > 0,
      );
      TestValidator.predicate(
        `identity[${idx}] has linked_at`,
        typeof identity.linked_at === "string" && identity.linked_at.length > 0,
      );
    });
  }
}
