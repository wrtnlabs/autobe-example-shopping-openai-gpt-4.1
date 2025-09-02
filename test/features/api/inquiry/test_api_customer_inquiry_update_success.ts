import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

/**
 * Validates that a customer can successfully update their own inquiry.
 *
 * This test verifies the normal workflow and integrity of the update
 * operation for customer inquiries:
 *
 * - Ensures correct owner registration (with authentication context)
 * - Confirms inquiry creation as that owner
 * - Performs update of multiple editable fields
 * - Validates responses, ensuring all changes and untouched fields are as
 *   expected
 *
 * Steps:
 *
 * 1. Register a new customer account (auth context set automatically)
 * 2. Create an inquiry as the registered customer
 * 3. Update the inquiry by changing allowed fields (title, body, private)
 * 4. Verify updated fields changed, others remained as before, and updated_at
 *    is newer
 */
export async function test_api_customer_inquiry_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authentication context
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1), // Optionally use null for unspecified nicknames
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;

  // 2. Create an inquiry as this customer
  const inquiryCreateInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customer.id,
    // For this test, we omit product_id, order_id, seller_id (test focuses on ownership and update)
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    private: false,
    status: "open",
  };
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      { body: inquiryCreateInput },
    );
  typia.assert(inquiry);

  // 3. Record original field values for later comparison
  const {
    id: originalId,
    customer_id: originalCustomerId,
    seller_id: originalSellerId,
    product_id: originalProductId,
    order_id: originalOrderId,
    status: originalStatus,
    created_at: originalCreatedAt,
    updated_at: originalUpdatedAt,
    deleted_at: originalDeletedAt,
  } = inquiry;

  // 4. Build an update payload modifying several fields
  const updatePayload: IShoppingMallAiBackendInquiry.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 9,
    }),
    private: true, // Toggle privacy
    // status and closed_at intentionally left unchanged for this test
  };

  // 5. Update the inquiry by its owner
  const updated =
    await api.functional.shoppingMallAiBackend.customer.inquiries.update(
      connection,
      {
        inquiryId: originalId,
        body: updatePayload,
      },
    );
  typia.assert(updated);

  // 6. Validate core immutable and identity fields remain the same
  TestValidator.equals(
    "inquiry ID should remain the same",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "customer_id should not change",
    updated.customer_id,
    originalCustomerId,
  );
  TestValidator.equals(
    "created_at must not change",
    updated.created_at,
    originalCreatedAt,
  );
  // For nullable fields, treat null/undefined as equal for this test's logic
  TestValidator.equals(
    "seller_id should remain as before",
    updated.seller_id ?? null,
    originalSellerId ?? null,
  );
  TestValidator.equals(
    "product_id should remain as before",
    updated.product_id ?? null,
    originalProductId ?? null,
  );
  TestValidator.equals(
    "order_id should remain as before",
    updated.order_id ?? null,
    originalOrderId ?? null,
  );
  TestValidator.equals(
    "status should remain unaltered",
    updated.status,
    originalStatus,
  );
  TestValidator.equals(
    "deleted_at should remain the same",
    updated.deleted_at ?? null,
    originalDeletedAt ?? null,
  );

  // 7. Validate updated fields changed as expected
  TestValidator.equals(
    "title should update to new value",
    updated.title,
    updatePayload.title,
  );
  TestValidator.equals(
    "body should update to new value",
    updated.body,
    updatePayload.body,
  );
  TestValidator.equals(
    "private flag should be updated",
    updated.private,
    updatePayload.private,
  );

  // 8. updated_at must strictly change
  TestValidator.notEquals(
    "updated_at must update after modification",
    updated.updated_at,
    originalUpdatedAt,
  );
}
