import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates that an authenticated admin can create a new global coupon
 * (amount-type) with a unique coupon_code, proper active status, a future
 * validity window, and a max_uses cap.
 *
 * Steps:
 *
 * 1. Register a new admin user via POST /auth/admin/join with random email and
 *    secure password. Status is set as 'active' per business rule.
 * 2. Using the authenticated admin context, POST /aiCommerce/admin/coupons
 *    with a newly generated unique coupon_code, type = 'amount', set
 *    'active' status, valid_from = now, valid_until = +20 days from now
 *    (ISO 8601 format), and max_uses = 20.
 * 3. Assert:
 *
 *    - Returned coupon object matches input coupon_code, type, status,
 *         valid_from, valid_until, and max_uses.
 *    - Coupon is persisted (id returned), with correct status and validity
 *         interval reflecting what was sent.
 *    - System accepts and records all required fields.
 *    - Coupon_code is unique in the platform (no prior coupon exists with this
 *         code).
 */
export async function test_api_admin_coupon_create_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(joinResult);

  // Step 2: Create unique coupon as admin
  const couponCode = `COUPON-${RandomGenerator.alphaNumeric(10)}`;
  const now = new Date();
  const validFrom = now.toISOString();
  const validUntil = new Date(
    now.getTime() + 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const maxUses = 20;

  const couponInput = {
    coupon_code: couponCode,
    type: "amount",
    valid_from: validFrom,
    valid_until: validUntil,
    max_uses: maxUses,
    status: "active",
  } satisfies IAiCommerceCoupon.ICreate;

  const coupon: IAiCommerceCoupon =
    await api.functional.aiCommerce.admin.coupons.create(connection, {
      body: couponInput,
    });
  typia.assert(coupon);

  // Step 3: Assertions
  TestValidator.predicate(
    "coupon id is present",
    typeof coupon.id === "string" && coupon.id.length > 0,
  );
  TestValidator.equals("coupon code matches", coupon.coupon_code, couponCode);
  TestValidator.equals("coupon type matches", coupon.type, "amount");
  TestValidator.equals("status matches", coupon.status, "active");
  TestValidator.equals("max_uses matches", coupon.max_uses, maxUses);
  TestValidator.equals("valid_from matches", coupon.valid_from, validFrom);
  TestValidator.equals("valid_until matches", coupon.valid_until, validUntil);
  TestValidator.predicate(
    "created_at is set",
    typeof coupon.created_at === "string" && coupon.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    typeof coupon.updated_at === "string" && coupon.updated_at.length > 0,
  );
}

/**
 * Review of the draft implementation:
 *
 * - No additional imports used, the template imports cover all needs.
 * - All required admin authentication and coupon creation steps are present.
 * - Await is correctly used for all API functional calls.
 * - TestValidator functions all use descriptive title as the first argument.
 * - All request bodies are constructed immutably with const, using satisfies and
 *   never type annotation.
 * - No usage of wrong type data, and null/undefined handling of optional fields
 *   is correct (omitted if absent, not set to undefined).
 * - Coupon_code uniqueness is done by using RandomGenerator.alphaNumeric, so
 *   business unique logic is followed as required.
 * - All assertions after typia.assert focus on business state, not redundant type
 *   validation.
 * - Status value matches allowed value per business docs ("active").
 * - No use of connection.headers and authentication context set only via API.
 * - No compilation errors, all types match the DTOs exactly.
 *
 * No forbidden patterns or errors found, and no type error testing exists.
 * Final code can be identical to the draft.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator functions always have title as first parameter
 *   - O Correct usage of typia.random<T>() with explicit type args
 *   - O No DTO type confusion (ICreate vs base vs ISummary etc)
 *   - O Never touch connection.headers in any way
 *   - O No TypeScript compilation errors (compiles cleanly)
 */
const __revise = {};
__revise;
