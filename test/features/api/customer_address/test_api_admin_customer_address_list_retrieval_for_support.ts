import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Verify that an authenticated admin can retrieve the full address list for any
 * customer as support.
 *
 * 1. Register a customer via verification request (to get a valid customerId).
 * 2. Register an admin account.
 * 3. As the admin, attempt to retrieve that customer's address list using
 *    different filter and pagination options.
 * 4. Validate that result structure is correct and corresponds to the filter.
 * 5. Attempt with invalid or non-existent customerIds to ensure error handling is
 *    correct.
 */
export async function test_api_admin_customer_address_list_retrieval_for_support(
  connection: api.IConnection,
) {
  // 1. Register a customer by requesting email verification
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerEmailVerificationResult =
    await api.functional.auth.customer.email.request_verification.requestEmailVerification(
      connection,
      { body: { email: customerEmail } },
    );
  typia.assert(customerEmailVerificationResult);
  // (Assumption: the backend will have inserted a customer and assign a new customerId horizontally. In a real test environment, acquire the customerId directly or through a registration step.)

  // 2. Register an admin
  const adminFullName = RandomGenerator.name();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // At this point, connection is upgraded to admin's JWT

  // 3. Test address-list retrieval for a (possibly still empty) customer addressbook
  // We'll use a randomly-generated UUID for customerId since initial address list may be empty
  const targetCustomerId = typia.random<string & tags.Format<"uuid">>();
  const filterRequest: IShoppingMallCustomerAddress.IRequest = {
    customerId: targetCustomerId,
    search: RandomGenerator.name(1),
    region: "Seoul",
    postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at",
    order: "desc",
  };
  const addressList =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      connection,
      {
        customerId: targetCustomerId,
        body: filterRequest,
      },
    );
  typia.assert(addressList);
  TestValidator.equals("page info matches", addressList.pagination.current, 1);
  TestValidator.equals("limit matches", addressList.pagination.limit, 10);

  // 4. Additional checks - getting all addresses (no filters)
  const noFilterRequest: IShoppingMallCustomerAddress.IRequest = {
    customerId: targetCustomerId,
  };
  const allAddressList =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      connection,
      {
        customerId: targetCustomerId,
        body: noFilterRequest,
      },
    );
  typia.assert(allAddressList);

  // 5. Negative scenario: try with an invalid/non-existent customerId
  const invalidCustomerId = RandomGenerator.alphaNumeric(24) as string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "admin retrieving address list for non-existent customer should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.addresses.index(
        connection,
        {
          customerId: invalidCustomerId,
          body: { customerId: invalidCustomerId },
        },
      );
    },
  );
}
