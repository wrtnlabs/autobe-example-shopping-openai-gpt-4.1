import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify admin update of all coupon fields end-to-end.
 *
 * This test follows the sequence:
 *
 * 1. Register a new admin and seller.
 * 2. Seller creates a coupon to be updatable.
 * 3. Switch to admin account, build a full IShoppingMallCoupon.IUpdate payload
 *    with new randomized test data for every updatable property (code, title,
 *    description, coupon_type, discount_type, discount_value, all limit/cap
 *    fields, stackable, exclusive, issued_at, expires_at, business_status,
 *    etc), and (optionally) campaign ID.
 * 4. Call the admin coupon update API.
 * 5. Assert all fields in the updated coupon match the request body, ensuring
 *    everything (except system fields like used_count, created_at, updated_at,
 *    deleted_at) was updated as intended.
 * 6. Check that business_status change and all boolean/enum fields reflect new
 *    values and are consistently updated.
 * 7. Confirm audit/evidence compliance through system-assigned timestamps and
 *    non-null updated_at.
 */
export async function test_api_admin_coupon_update_all_fields_success(
  connection: api.IConnection,
) {
  // 1. Register admin for update permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPW123!",
      name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register a seller with random channel/section
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPW123!",
      name: RandomGenerator.name(2),
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
      profile_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 3. Seller creates a coupon for updating
  const couponPayload = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    coupon_type: RandomGenerator.pick([
      "public",
      "private",
      "seller",
      "one-time",
    ] as const),
    discount_type: RandomGenerator.pick([
      "amount",
      "percentage",
      "free_shipping",
    ] as const),
    discount_value: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50000>
    >() satisfies number as number,
    min_order_amount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    max_discount_amount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<20000>
    >(),
    stackable: false,
    exclusive: true,
    usage_limit_total: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    usage_limit_per_user: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    issuance_limit_total: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<500>
    >(),
    issued_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000 * 24 * 30).toISOString(),
    business_status: RandomGenerator.pick([
      "draft",
      "active",
      "paused",
      "expired",
    ] as const),
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.seller.coupons.create(
    connection,
    {
      body: couponPayload,
    },
  );
  typia.assert(coupon);

  // 4. Switch to admin account for update
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPW123!",
      name: admin.name,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // 5. Build a full IShoppingMallCoupon.IUpdate payload with new values for all fields
  const updateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    coupon_type: RandomGenerator.pick([
      "public",
      "private",
      "seller",
      "one-time",
    ] as const),
    discount_type: RandomGenerator.pick([
      "amount",
      "percentage",
      "free_shipping",
    ] as const),
    discount_value: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<9999>
    >() satisfies number as number,
    min_order_amount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    max_discount_amount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<30000>
    >(),
    stackable: true,
    exclusive: false,
    usage_limit_total: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<2000>
    >(),
    usage_limit_per_user: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    issuance_limit_total: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<1000>
    >(),
    issued_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000 * 24 * 60).toISOString(),
    business_status: RandomGenerator.pick([
      "active",
      "paused",
      "expired",
      "draft",
    ] as const),
    shopping_mall_coupon_campaign_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IShoppingMallCoupon.IUpdate;

  // 6. Update coupon as admin
  const updated = await api.functional.shoppingMall.admin.coupons.update(
    connection,
    {
      couponId: coupon.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 7. Assert all updated fields
  TestValidator.equals("coupon id unchanged", updated.id, coupon.id);
  TestValidator.equals("coupon code updated", updated.code, updateBody.code);
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "coupon_type updated",
    updated.coupon_type,
    updateBody.coupon_type,
  );
  TestValidator.equals(
    "discount_type updated",
    updated.discount_type,
    updateBody.discount_type,
  );
  TestValidator.equals(
    "discount_value updated",
    updated.discount_value,
    updateBody.discount_value,
  );
  TestValidator.equals(
    "min_order_amount updated",
    updated.min_order_amount,
    updateBody.min_order_amount,
  );
  TestValidator.equals(
    "max_discount_amount updated",
    updated.max_discount_amount,
    updateBody.max_discount_amount,
  );
  TestValidator.equals(
    "stackable updated",
    updated.stackable,
    updateBody.stackable,
  );
  TestValidator.equals(
    "exclusive updated",
    updated.exclusive,
    updateBody.exclusive,
  );
  TestValidator.equals(
    "usage_limit_total updated",
    updated.usage_limit_total,
    updateBody.usage_limit_total,
  );
  TestValidator.equals(
    "usage_limit_per_user updated",
    updated.usage_limit_per_user,
    updateBody.usage_limit_per_user,
  );
  TestValidator.equals(
    "issuance_limit_total updated",
    updated.issuance_limit_total,
    updateBody.issuance_limit_total,
  );
  TestValidator.equals(
    "issued_at updated",
    updated.issued_at,
    updateBody.issued_at,
  );
  TestValidator.equals(
    "expires_at updated",
    updated.expires_at,
    updateBody.expires_at,
  );
  TestValidator.equals(
    "business_status updated",
    updated.business_status,
    updateBody.business_status,
  );
  TestValidator.equals(
    "campaign id updated",
    updated.shopping_mall_coupon_campaign_id,
    updateBody.shopping_mall_coupon_campaign_id,
  );
  TestValidator.predicate(
    "updated_at is non-null",
    typeof updated.updated_at === "string" && !!updated.updated_at,
  );
}
