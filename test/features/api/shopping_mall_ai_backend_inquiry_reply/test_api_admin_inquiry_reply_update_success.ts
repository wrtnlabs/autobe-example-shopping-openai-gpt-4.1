import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";

export async function test_api_admin_inquiry_reply_update_success(
  connection: api.IConnection,
) {
  /**
   * Validate that admin users can update a reply on any inquiry (success
   * scenario).
   *
   * Steps (with business context):
   *
   * 1. Create admin & authenticate (tokens issued/role switching verified)
   * 2. Create customer & authenticate (separate role, real scenario)
   * 3. As customer, create a valid inquiry
   * 4. Switch auth to admin
   * 5. As admin, create a reply to that inquiry
   * 6. As admin, update reply (body/private)
   * 7. Assert update: updated body/private, audit trail reflects change, others
   *    unchanged
   *
   * Validates full business owner/role switching, relationship constraints,
   * field audit integrity.
   */

  // 1. Create admin & login
  const adminUsername: string =
    RandomGenerator.name().replace(/\s/g, "_") +
    RandomGenerator.alphaNumeric(4);
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // For testing: raw pass as hash
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}_${RandomGenerator.name(1)}@admin.test`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals(
    "admin login returns admin",
    adminLogin.admin.username,
    adminUsername,
  );

  // 2. Create customer & login
  const customerEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}_${RandomGenerator.name(1)}@customer.com`;
  const customerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(10) as string & tags.Format<"password">;
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  TestValidator.equals(
    "customer join returns correct email",
    customerJoin.customer.email,
    customerEmail,
  );
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(customerLogin);

  // 3. As customer, create inquiry
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          customer_id: typia.assert(customerJoin.customer.id!),
          seller_id: null,
          product_id: null,
          order_id: null,
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 10,
          }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);
  TestValidator.equals(
    "inquiry is tied to customer",
    inquiry.customer_id,
    customerJoin.customer.id,
  );

  // 4. Switch back to admin by login (simulate real role switching)
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });
  typia.assert(adminLoginAgain);
  TestValidator.equals(
    "admin login again username matches",
    adminLoginAgain.admin.username,
    adminUsername,
  );

  // 5. As admin, create reply to that inquiry
  const replyOrig =
    await api.functional.shoppingMallAiBackend.admin.inquiries.replies.create(
      connection,
      {
        inquiryId: inquiry.id,
        body: {
          inquiry_id: inquiry.id,
          parent_id: null,
          body: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          private: false,
        } satisfies IShoppingMallAiBackendInquiryReply.ICreate,
      },
    );
  typia.assert(replyOrig);
  TestValidator.equals(
    "reply is for correct inquiry",
    replyOrig.inquiry_id,
    inquiry.id,
  );
  TestValidator.equals("reply not deleted", replyOrig.deleted_at, null);
  TestValidator.equals("reply author is admin", replyOrig.author_type, "admin");

  // 6. Update reply's contents and privacy
  const updatedBody: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 8,
    wordMax: 14,
  });
  const updatedPrivate = true;
  const replyUpd =
    await api.functional.shoppingMallAiBackend.admin.inquiries.replies.update(
      connection,
      {
        inquiryId: inquiry.id,
        replyId: replyOrig.id,
        body: {
          body: updatedBody,
          private: updatedPrivate,
        } satisfies IShoppingMallAiBackendInquiryReply.IUpdate,
      },
    );
  typia.assert(replyUpd);

  // 7. Assertions for update success (business and field integrity)
  TestValidator.equals("reply id unaltered", replyUpd.id, replyOrig.id);
  TestValidator.equals("inquiry id matches", replyUpd.inquiry_id, inquiry.id);
  TestValidator.equals("reply body updated", replyUpd.body, updatedBody);
  TestValidator.equals(
    "reply privacy flag updated",
    replyUpd.private,
    updatedPrivate,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    replyUpd.updated_at,
    replyOrig.updated_at,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    replyUpd.created_at,
    replyOrig.created_at,
  );
  TestValidator.equals(
    "reply still active (not deleted)",
    replyUpd.deleted_at,
    null,
  );
  TestValidator.equals(
    "reply author type still admin",
    replyUpd.author_type,
    "admin",
  );
}
