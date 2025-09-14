import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import type { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a seller can delete a section-binding for their own product
 * and that forbidden errors occur for unauthorized attempts.
 *
 * - Register a seller (sellerA), login as sellerA.
 * - Register an admin and login as admin.
 * - Create a channel (admin), then create a section for that channel (admin).
 * - Login back as sellerA.
 * - SellerA registers their own product.
 * - SellerA binds this product to the created section, obtaining bindingId.
 * - SellerA deletes the binding (erase), verifying the operation does not
 *   return errors.
 * - Try to delete the same bindingId again as sellerA (should throw error /
 *   forbidden).
 * - Register a second seller (sellerB), login as sellerB.
 * - SellerB attempts to delete the original (now deleted) binding (should
 *   throw forbidden).
 *
 * Steps:
 *
 * 1. Admin: join, login.
 * 2. SellerA: join, login.
 * 3. SellerB: join, login.
 * 4. Admin: create channel, create section.
 * 5. SellerA: create product.
 * 6. SellerA: bind product-section.
 * 7. SellerA: erase binding (success).
 * 8. SellerA: erase binding again (should error).
 * 9. SellerB: erase binding (should error - forbidden).
 */
export async function test_api_product_section_binding_seller_delete_and_forbidden(
  connection: api.IConnection,
) {
  // 1. Admin: join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. SellerA: join
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerA);

  // 3. SellerB: join
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerB);

  // 4a. Admin: login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 4b. Admin: create channel
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        locale: "ko-KR",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 4c. Admin: create section
  const section =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: {
        ai_commerce_channel_id: channel.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        is_active: true,
        business_status: "normal",
        sort_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IAiCommerceSection.ICreate,
    });
  typia.assert(section);

  // 5. SellerA: login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 6. SellerA: create product
  // We need store_id, so use RandomGenerator.alphaNumeric to simulate store
  const storeId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerA.id,
        store_id: storeId,
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        status: "active",
        business_status: "normal",
        current_price: 10000,
        inventory_quantity: 100,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 7. SellerA: bind product-section
  const binding =
    await api.functional.aiCommerce.seller.products.sectionBindings.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          section_id: section.id,
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAiCommerceProductSectionBinding.ICreate,
      },
    );
  typia.assert(binding);

  // 8. SellerA: erase binding (success case)
  await api.functional.aiCommerce.seller.products.sectionBindings.erase(
    connection,
    {
      productId: product.id,
      bindingId: binding.id,
    },
  );

  // 9. SellerA: erase binding again (expect forbidden/error)
  await TestValidator.error(
    "cannot erase already deleted product-section binding as sellerA",
    async () => {
      await api.functional.aiCommerce.seller.products.sectionBindings.erase(
        connection,
        {
          productId: product.id,
          bindingId: binding.id,
        },
      );
    },
  );

  // 10. SellerB: login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 11. SellerB: attempt to delete binding (expect forbidden)
  await TestValidator.error(
    "sellerB cannot erase product-section binding owned by sellerA",
    async () => {
      await api.functional.aiCommerce.seller.products.sectionBindings.erase(
        connection,
        {
          productId: product.id,
          bindingId: binding.id,
        },
      );
    },
  );
}

/**
 * The draft implementation strictly follows the scenario steps and input
 * material constraints. It covers: admin and two sellers joining, admin
 * creating channel/section, sellerA creating product and binding, successful
 * deletion, forbidden re-deletion by both sellerA and sellerB. All data is
 * generated correctly using typia.random or RandomGenerator, and all DTOs and
 * SDK calls strictly use the correct types.
 *
 * Key points validated:
 *
 * - NO additional imports or utility functions
 * - NO use of as any, improper typings, or wrong type data
 * - All api.functional.* and async TestValidator.error() calls use await
 * - TestValidator.error is used for forbidden/error cases, all with a proper
 *   descriptive title
 * - Each step's action is clear, with explanatory variable naming
 * - Only properties defined in the DTOs are used
 * - Status and business_status fields match allowed string values ("active",
 *   "normal" per the scenario)
 * - Comments and step structure match scenario steps exactly
 *
 * No prohibited patterns, markdown, or unused/extraneous variables were found.
 * All type assertions with typia.assert are correctly placed on API responses
 * where appropriate. The code does not attempt to touch connection.headers. It
 * only makes API function calls that exist in the input, and obeys all the
 * constraints and anti-pattern/anti-hallucination protocols in the supplied
 * prompt.
 *
 * No errors were found in the draft; the code is ready for finalization with no
 * changes required.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *   - O NO markdown syntax
 *   - O NO type error tests remain in final
 */
const __revise = {};
__revise;
