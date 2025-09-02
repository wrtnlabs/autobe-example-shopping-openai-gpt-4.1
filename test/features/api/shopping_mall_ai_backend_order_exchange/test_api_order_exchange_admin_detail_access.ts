import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";

export async function test_api_order_exchange_admin_detail_access(
  connection: api.IConnection,
) {
  /**
   * Validates admin access to detailed order exchange information, including
   * sensitive fields, confirming business and access control compliance.
   *
   * Workflow:
   *
   * 1. Register and authenticate an admin via /auth/admin/join (token set
   *    automatically).
   * 2. Prepare random UUIDs for existing order and exchange.
   * 3. Request exchange detail as admin and perform thorough response validation.
   */

  // 1. Register and authenticate an admin
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Generate valid UUIDs for order and exchange (simulate existing exchange record)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const exchangeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Request exchange detail as admin
  const exchange: IShoppingMallAiBackendOrderExchange =
    await api.functional.shoppingMallAiBackend.admin.orders.exchanges.at(
      connection,
      {
        orderId,
        exchangeId,
      },
    );
  typia.assert(exchange);

  // Validate key field matching
  TestValidator.equals(
    "returned exchange id matches requested",
    exchange.id,
    exchangeId,
  );
  TestValidator.equals(
    "returned order id matches requested",
    exchange.shopping_mall_ai_backend_order_id,
    orderId,
  );

  // Validate field presence and type
  TestValidator.predicate(
    "admin can view sensitive status and reason fields",
    typeof exchange.status === "string" &&
      typeof exchange.exchange_reason === "string",
  );
  TestValidator.predicate(
    "exchange requested_at and created_at are non-empty date-strings",
    typeof exchange.created_at === "string" &&
      exchange.created_at.length >= 20 &&
      typeof exchange.requested_at === "string" &&
      exchange.requested_at.length >= 20,
  );
  TestValidator.predicate(
    "exchange updated_at is valid date-string",
    typeof exchange.updated_at === "string" && exchange.updated_at.length >= 20,
  );

  // All required fields (nullable and optional) are enforced in DTO, typia.assert covers this check
}
