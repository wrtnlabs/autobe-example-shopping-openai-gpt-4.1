import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

/**
 * Verifies that an admin can retrieve detailed information of any historical
 * order address for compliance, audit, or investigation purposes.
 *
 * 1. Register a new admin account.
 * 2. Register a new customer (and address-on-join).
 * 3. As the customer, create an immutable historical order address snapshot.
 * 4. As admin, retrieve the order address detail by its ID, ensuring all address
 *    fields are present, type-safe, and no extraneous PII is leaked.
 */
export async function test_api_order_address_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerFullName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customerAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 12,
    }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    address_line2: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      full_name: customerFullName,
      phone: customerPhone,
      address: customerAddress,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. As the customer, create a new order address
  const orderAddressInput = {
    address_type: RandomGenerator.pick([
      "shipping",
      "billing",
      "both",
    ] as const),
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    address_detail: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    country_code: RandomGenerator.pick(["KOR", "USA", "JPN", "CHN"] as const),
  } satisfies IShoppingMallOrderAddress.ICreate;
  const createdOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: orderAddressInput,
      },
    );
  typia.assert(createdOrderAddress);

  // 4. As admin, retrieve the order address detail
  // (no need to re-login explicitly as admin; token should already be in context)
  const orderAddress =
    await api.functional.shoppingMall.admin.orderAddresses.at(connection, {
      orderAddressId: createdOrderAddress.id,
    });
  typia.assert(orderAddress);

  // Core field assertions (business rules & privacy)
  TestValidator.predicate(
    "orderAddress.id must be valid uuid",
    typeof orderAddress.id === "string" && orderAddress.id.length > 0,
  );
  TestValidator.equals(
    "orderAddress.recipient_name matches input",
    orderAddress.recipient_name,
    orderAddressInput.recipient_name,
  );
  TestValidator.equals(
    "orderAddress.phone matches input",
    orderAddress.phone,
    orderAddressInput.phone,
  );
  TestValidator.equals(
    "orderAddress.zip_code matches input",
    orderAddress.zip_code,
    orderAddressInput.zip_code,
  );
  TestValidator.equals(
    "orderAddress.address_main matches input",
    orderAddress.address_main,
    orderAddressInput.address_main,
  );
  TestValidator.equals(
    "orderAddress.address_detail matches input",
    orderAddress.address_detail,
    orderAddressInput.address_detail,
  );
  TestValidator.equals(
    "orderAddress.address_type matches input",
    orderAddress.address_type,
    orderAddressInput.address_type,
  );
  TestValidator.equals(
    "orderAddress.country_code matches input",
    orderAddress.country_code,
    orderAddressInput.country_code,
  );
  TestValidator.predicate(
    "orderAddress.created_at is present",
    typeof orderAddress.created_at === "string" &&
      orderAddress.created_at.length > 0,
  );
  // Privacy: this DTO must not expose more than the documented fields
  const allowedKeys = [
    "id",
    "address_type",
    "recipient_name",
    "phone",
    "zip_code",
    "address_main",
    "address_detail",
    "country_code",
    "created_at",
  ];
  TestValidator.equals(
    "only allowed fields exist in DTO",
    Object.keys(orderAddress).sort(),
    allowedKeys.sort(),
  );
}
