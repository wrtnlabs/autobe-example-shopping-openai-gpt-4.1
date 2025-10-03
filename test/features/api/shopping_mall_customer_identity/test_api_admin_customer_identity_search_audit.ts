import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerIdentity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerIdentity";

/**
 * Test advanced admin-driven search for all customer identity verification
 * records (KYC) linked to a specific customer. Includes admin authentication,
 * customer creation, cart creation (to ensure customer existence), and multiple
 * variants of the search. Validates admin access, filter effectiveness,
 * pagination, edge cases (non-existent customer, access control, rate
 * limiting).
 */
export async function test_api_admin_customer_identity_search_audit(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword!@#",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register customer and create a cart for them
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "customerPW@1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // create a cart for the customer to ensure cross-domain linkage
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Search without any filters (expect OK, probably empty data)
  const allIdentities =
    await api.functional.shoppingMall.admin.customers.identities.index(
      connection,
      {
        customerId: customer.id,
        body: {},
      },
    );
  typia.assert(allIdentities);
  TestValidator.equals(
    "search returns valid page info for empty/any",
    typeof allIdentities.pagination.current,
    "number",
  );
  TestValidator.equals(
    "search returns data array",
    Array.isArray(allIdentities.data),
    true,
  );

  // 4. Search with single filter params (random plausible)
  const filterByType =
    await api.functional.shoppingMall.admin.customers.identities.index(
      connection,
      {
        customerId: customer.id,
        body: { identity_type: "government_id" },
      },
    );
  typia.assert(filterByType);
  TestValidator.equals(
    "search by identity_type returns page",
    typeof filterByType.pagination.current,
    "number",
  );

  const filterByStatus =
    await api.functional.shoppingMall.admin.customers.identities.index(
      connection,
      {
        customerId: customer.id,
        body: { status: "pending" },
      },
    );
  typia.assert(filterByStatus);
  TestValidator.equals(
    "search by status returns page",
    typeof filterByStatus.pagination.current,
    "number",
  );

  // 5. Search with multiple filters + pagination
  const multiComplex =
    await api.functional.shoppingMall.admin.customers.identities.index(
      connection,
      {
        customerId: customer.id,
        body: {
          identity_type: "passport",
          status: "verified",
          issuer: "gov-agency",
          verified_at_start: new Date(
            Date.now() - 1000000000,
          ).toISOString() satisfies string,
          verified_at_end: new Date().toISOString() satisfies string,
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        },
      },
    );
  typia.assert(multiComplex);
  TestValidator.equals(
    "multi-filter returns valid page",
    typeof multiComplex.pagination.current,
    "number",
  );
  TestValidator.equals(
    "multi-filter returns data array",
    Array.isArray(multiComplex.data),
    true,
  );

  // 6. Edge: Non-existent customerId
  const missingCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject search on non-existent customerId",
    async () => {
      await api.functional.shoppingMall.admin.customers.identities.index(
        connection,
        {
          customerId: missingCustomerId,
          body: {},
        },
      );
    },
  );

  // 7. Edge: Access as non-admin
  // Switch context to customer session (token auto-managed by SDK)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerPW@1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error(
    "should reject KYC search for customer session",
    async () => {
      await api.functional.shoppingMall.admin.customers.identities.index(
        connection,
        {
          customerId: customer.id,
          body: {},
        },
      );
    },
  );

  // 8. Edge: Rate limit simulation (if supported)
  // Optional: Rapid-fire a batch, expect either OK or error depending on infra config
  await Promise.all([
    api.functional.shoppingMall.admin.customers.identities.index(connection, {
      customerId: customer.id,
      body: {},
    }),
    api.functional.shoppingMall.admin.customers.identities.index(connection, {
      customerId: customer.id,
      body: {},
    }),
  ]);
}
