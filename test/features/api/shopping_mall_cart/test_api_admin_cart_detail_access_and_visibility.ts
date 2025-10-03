import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate that admin can access and view detailed shopping cart information
 * for audit, operations, and compliance purposes.
 *
 * Tests the following workflow:
 *
 * 1. Register an admin and gain authentication
 * 2. Create a shopping mall channel as admin
 * 3. Create a section within the channel as admin
 * 4. Register a customer for the mall/channel
 * 5. Customer creates a cart within the channel/section
 * 6. Admin fetches the cart detail by cartId
 * 7. Validates all cart fields are accessible and visible by admin
 * 8. Tries to fetch a non-existent cartId and confirms error
 * 9. (Optional) Tries to fetch a soft-deleted cart and confirms proper error or
 *    redacted response
 * 10. Checks that business, audit, and field-level requirements are satisfied,
 *     including ownership-agnostic access
 */
export async function test_api_admin_cart_detail_access_and_visibility(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelName = RandomGenerator.name();
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: channelName,
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section in the channel
  const sectionCode = RandomGenerator.alphaNumeric(7);
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
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Register a customer for the channel
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);

  // 5. Customer creates a cart in the section
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerAuth.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 6. Admin fetches the cart detail by cartId (should succeed)
  const adminCart = await api.functional.shoppingMall.admin.carts.at(
    connection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(adminCart);
  TestValidator.equals(
    "admin can retrieve exact cart id",
    adminCart.id,
    cart.id,
  );
  TestValidator.equals(
    "cart references correct customer",
    adminCart.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cart references correct channel",
    adminCart.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "cart references correct section",
    adminCart.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals("cart source should match", adminCart.source, "member");
  TestValidator.predicate(
    "cart status should be present",
    typeof adminCart.status === "string" && adminCart.status.length > 0,
  );
  TestValidator.predicate(
    "admin can see created_at and updated_at fields",
    typeof adminCart.created_at === "string" &&
      typeof adminCart.updated_at === "string",
  );
  TestValidator.predicate(
    "cart not soft-deleted",
    adminCart.deleted_at === null || adminCart.deleted_at === undefined,
  );

  // 7. Admin tries to fetch a non-existent cartId (should error)
  const invalidCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("admin cannot get non-existent cart", async () => {
    await api.functional.shoppingMall.admin.carts.at(connection, {
      cartId: invalidCartId,
    });
  });

  // 8. (Optional) There is no soft-delete endpoint, but simulate by checking deleted_at manually if possible (we can't call a delete, but can assert field is nullable and admin can see it if present)
  // This may be more detail than available (because carts will not have deleted_at set unless implicitly handled in test fixtures)
  // Do not attempt to forcibly soft-delete via unavailable endpoints.
}
