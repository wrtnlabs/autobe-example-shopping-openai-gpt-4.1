import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

export async function test_api_admin_coupon_creation_success_and_uniqueness_violation(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin creates a coupon successfully and duplicate code triggers
   * business error.
   *
   * 1. Register new admin (join), check returned username/email, ensure token
   *    injected for next requests.
   * 2. Create coupon with required core business fields (code, type, value, title,
   *    etc.). Validate response code, type, value, status, evidence fields.
   * 3. Retry coupon creation with same code to assert uniqueness error handling.
   */

  // 1. Admin registration & authentication
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${adminUsername}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulated hash
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: RandomGenerator.name(2),
    email: adminEmail,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "joined admin username matches input",
    adminAuthorized.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "joined admin email matches input",
    adminAuthorized.admin.email,
    adminEmail,
  );

  // 2. Coupon creation (happy path)
  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const couponCreateInput: IShoppingMallAiBackendCoupon.ICreate = {
    code: couponCode,
    type: "fixed",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    value: 5000,
    stackable: true,
    personal: false,
    status: "active",
  };
  const createdCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponCreateInput },
    );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "created coupon code matches input",
    createdCoupon.code,
    couponCode,
  );
  TestValidator.equals(
    "coupon type is fixed",
    createdCoupon.type,
    couponCreateInput.type,
  );
  TestValidator.equals(
    "coupon value matches",
    createdCoupon.value,
    couponCreateInput.value,
  );
  TestValidator.equals(
    "status field is active",
    createdCoupon.status,
    couponCreateInput.status,
  );
  TestValidator.predicate(
    "created_at should be a valid ISO date string",
    typeof createdCoupon.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCoupon.created_at),
  );

  // 3. Error on duplicate code
  await TestValidator.error("duplicate coupon code should fail", async () => {
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: { ...couponCreateInput } },
    );
  });
}
