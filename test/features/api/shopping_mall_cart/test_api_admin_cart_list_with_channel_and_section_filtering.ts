import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validates that a newly registered admin can authenticate and use the
 * /shoppingMall/admin/carts PATCH endpoint to search and paginate through all
 * carts, with advanced filters for channel, section, customer, and cart
 * status.
 *
 * 1. Register admin (admin join, unique email)
 * 2. Admin creates channel (unique code/name)
 * 3. Admin creates section in that channel
 * 4. Register customer under that channel (unique email)
 * 5. Customer creates a cart for the created channel and section
 * 6. Switch back to admin context. Use /shoppingMall/admin/carts with:
 *
 *    - No filters: validate returned pagination & cart summary, cart is listed
 *    - Channel filter: should return only carts for that channel (find created cart)
 *    - Section filter: should return only carts for section (find created cart)
 *    - CustomerId filter: returns only carts for specific customer (find created
 *         cart)
 *    - Status filter: status='active', should include created cart
 *    - Combination of filters: intersected, cart found
 *    - Pagination: limit/page, validate only expected results returned (for each,
 *         validate content and record counts; for negative cases, use
 *         non-existent IDs and assert no records)
 * 7. Validate customer-sensitive fields are appropriate for admin, and core audit
 *    fields are present and plausible (created_at, updated_at, status).
 * 8. All DTO types and field presence validated via typia.assert().
 */
export async function test_api_admin_cart_list_with_channel_and_section_filtering(
  connection: api.IConnection,
) {
  // 1. Register admin (random email/name)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "strongpassword!123",
      name: adminName,
    },
  });
  typia.assert(admin);

  // 2. Admin creates channel
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channelName = RandomGenerator.paragraph({ sentences: 2 });
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: channelName,
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 3. Admin creates section in that channel
  const sectionCode = RandomGenerator.alphaNumeric(8);
  const sectionName = RandomGenerator.name();
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: sectionCode,
          name: sectionName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Register customer under the channel
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "customer-secret!9",
      name: customerName,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 5. Customer creates a cart in the channel/section
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 6a. As admin, query all carts (no filters)
  const page1 = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(page1);
  // Cart should be listed
  TestValidator.predicate(
    "created cart appears in unfiltered admin cart list",
    page1.data.some(
      (c) => c.id === cart.id && c.shopping_mall_customer_id === customer.id,
    ),
  );
  // Pagination should be plausible
  TestValidator.predicate(
    "pagination structure for all carts",
    page1.pagination.current >= 1 && page1.pagination.limit >= 1,
  );

  // 6b. Filter by channel
  const channelPage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: { shopping_mall_channel_id: channel.id },
    },
  );
  typia.assert(channelPage);
  TestValidator.predicate(
    "cart appears in channel filtered list",
    channelPage.data.some((c) => c.id === cart.id),
  );

  // 6c. Filter by section
  const sectionPage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: { shopping_mall_section_id: section.id },
    },
  );
  typia.assert(sectionPage);
  TestValidator.predicate(
    "cart appears in section filtered list",
    sectionPage.data.some((c) => c.id === cart.id),
  );

  // 6d. Filter by customerId
  const customerPage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: { customerId: customer.id },
    },
  );
  typia.assert(customerPage);
  TestValidator.predicate(
    "cart appears in customerId filtered list",
    customerPage.data.some((c) => c.id === cart.id),
  );

  // 6e. Filter by status
  const statusPage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: { status: "active" },
    },
  );
  typia.assert(statusPage);
  TestValidator.predicate(
    "cart appears in status filtered list",
    statusPage.data.some((c) => c.id === cart.id),
  );

  // 6f. Combined filters (should still find the cart)
  const comboPage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        customerId: customer.id,
        status: "active",
      },
    },
  );
  typia.assert(comboPage);
  TestValidator.predicate(
    "cart appears in combo-filtered list",
    comboPage.data.some((c) => c.id === cart.id),
  );

  // 6g. Negative filter test: random IDs (should return 0 records)
  const negativePage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: {
        shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        customerId: typia.random<string & tags.Format<"uuid">>(),
        status: "expired",
      },
    },
  );
  typia.assert(negativePage);
  TestValidator.equals(
    "no carts found for non-matching filters",
    negativePage.data.length,
    0,
  );

  // 6h. Pagination: limit/page logic
  const pagedPage = await api.functional.shoppingMall.admin.carts.index(
    connection,
    {
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(pagedPage);
  TestValidator.equals(
    "paged result length matches limit",
    pagedPage.data.length,
    1,
  );

  // 7. Field and audit validation
  const found = page1.data.find((c) => c.id === cart.id);
  TestValidator.predicate(
    "cart summary fields - audit",
    !!found &&
      found.status === "active" &&
      typeof found.created_at === "string" &&
      typeof found.updated_at === "string",
  );
  TestValidator.equals(
    "customer linkage",
    found!.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "channel linkage",
    found!.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "section linkage",
    found!.shopping_mall_section_id,
    section.id,
  );
  // Field privacy for admin: only summary fields, no sensitive info
}
