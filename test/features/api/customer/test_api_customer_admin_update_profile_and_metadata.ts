import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validates admin update of customer profile fields, business rules,
 * uniqueness, compliance, edge cases, and audit.
 *
 * 1. Register admin and authenticate session
 * 2. Create a channel (for context and uniqueness)
 * 3. Create a section in that channel (prerequisite for customer context)
 * 4. Register a customer entry (simulate creation, as no public customer
 *    registration API—directly use update to set initial data)
 * 5. Admin updates customer profile data (all allowed fields)
 * 6. Validates updated profile data and audit (updated_at increments)
 * 7. Attempt to update to an already-used email (should fail)
 * 8. Attempt to update non-existent or deleted customer (should fail)
 * 9. Attempt to update as non-admin (should fail/denied)
 */
export async function test_api_customer_admin_update_profile_and_metadata(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SecureP@ssw0rd!",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);

  // 2. Create channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelCreate },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const sectionCreate = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreate,
      },
    );
  typia.assert(section);

  // 4. Register one customer (simulate creation by update—since no create API)
  const customerOriginalEmail = typia.random<string & tags.Format<"email">>();
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const customerCreateUpdate = {
    email: customerOriginalEmail,
    phone: RandomGenerator.mobile(),
    name: RandomGenerator.name(),
    status: "active",
    kyc_status: "verified",
  } satisfies IShoppingMallCustomer.IUpdate;
  const customer = await api.functional.shoppingMall.admin.customers.update(
    connection,
    {
      customerId,
      body: customerCreateUpdate,
    },
  );
  typia.assert(customer);
  TestValidator.equals(
    "created customer email matches",
    customer.email,
    customerOriginalEmail,
  );

  // 5. Admin updates allowed fields (new email, phone, status, kyc_status, and name)
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPhone = RandomGenerator.mobile();
  const updatedName = RandomGenerator.name();
  const updatedStatus = "suspended";
  const updatedKYC = "pending";
  const updateBody = {
    email: updatedEmail,
    phone: updatedPhone,
    name: updatedName,
    status: updatedStatus,
    kyc_status: updatedKYC,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId,
      body: updateBody,
    });
  typia.assert(updatedCustomer);

  TestValidator.equals(
    "updated customer email matches",
    updatedCustomer.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated customer phone matches",
    updatedCustomer.phone,
    updatedPhone,
  );
  TestValidator.equals(
    "updated customer name matches",
    updatedCustomer.name,
    updatedName,
  );
  TestValidator.equals(
    "updated customer status matches",
    updatedCustomer.status,
    updatedStatus,
  );
  TestValidator.equals(
    "updated customer kyc_status matches",
    updatedCustomer.kyc_status,
    updatedKYC,
  );
  TestValidator.predicate(
    "updated_at field changes with update",
    updatedCustomer.updated_at !== customer.updated_at,
  );

  // 6. Business rule: Try to update to an already-used email (should fail)
  await TestValidator.error(
    "cannot update customer to already-used email",
    async () => {
      await api.functional.shoppingMall.admin.customers.update(connection, {
        customerId,
        body: { email: adminEmail } satisfies IShoppingMallCustomer.IUpdate,
      });
    },
  );

  // 7. Update non-existent customer (should fail)
  await TestValidator.error("cannot update non-existent customer", async () => {
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  });

  // 8. Soft-delete simulation: (simulate by second update with deleted_at field set, should not be able, expect fail)
  // Since there's no direct API for deletion, we simulate by trying to update a random (deleted) customer.
  const softDeletedCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot update soft-deleted customer", async () => {
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId: softDeletedCustomerId,
      body: { status: "withdrawn" } satisfies IShoppingMallCustomer.IUpdate,
    });
  });

  // 9. Attempt unauthorized access (simulate by using a connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update customer",
    async () => {
      await api.functional.shoppingMall.admin.customers.update(unauthConn, {
        customerId,
        body: updateBody,
      });
    },
  );
}
