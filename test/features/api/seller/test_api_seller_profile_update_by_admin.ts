import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin update of all editable fields on a seller profile, covering normal
 * updates, business logic, and error cases.
 *
 * 1. Admin joins/authenticates
 * 2. Admin creates category (for product context)
 * 3. Admin creates SELLER role
 * 4. Register a new seller (as the profile to be updated)
 * 5. Seller has a product created (platform context)
 * 6. Admin updates all editable fields of seller using admin endpoint:
 *    business_name, contact_name, phone, kyc_document_uri, approval_status,
 *    business_registration_number, email_verified, deleted_at
 * 7. Validate each update took effect on the seller record (field-by-field
 *    type/value checks)
 * 8. Test invalid field values (e.g., too-short phone)
 * 9. Test unique-field violations (e.g., duplicate business_registration_number)
 * 10. Test status changes (e.g., pending → approved, approved → suspended, etc) and
 *     enforce logical status flow
 * 11. Attempt updates on deleted/suspended sellers
 * 12. Confirm auditability: updated_at must change after update
 * 13. Validate errors on invalid requests (TestValidator.error usage with title)
 */
export async function test_api_seller_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins/authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Admin creates SELLER role
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Can manage own product listings and fulfill orders",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 4. Register new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessReg = "BRN-" + RandomGenerator.alphaNumeric(8);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerBusinessReg,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 5. Seller has a product created (for context, use admin connection)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Admin updates ALL editable fields with new values
  const newBusinessName = RandomGenerator.name();
  const newContactName = RandomGenerator.name();
  const newPhone = RandomGenerator.mobile();
  const newKyc =
    "https://files.example.com/kyc/" + RandomGenerator.alphaNumeric(10);
  const newApprovalStatus = "approved"; // valid status
  const newBusinessRegNum = "BRN-" + RandomGenerator.alphaNumeric(8);
  const newEmailVerified = true;
  const updateBody: IShoppingMallSeller.IUpdate = {
    business_name: newBusinessName,
    contact_name: newContactName,
    phone: newPhone,
    kyc_document_uri: newKyc,
    approval_status: newApprovalStatus,
    business_registration_number: newBusinessRegNum,
    email_verified: newEmailVerified,
  };
  const updated: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: seller.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "business_name updated",
    updated.business_name,
    newBusinessName,
  );
  TestValidator.equals(
    "contact_name updated",
    updated.contact_name,
    newContactName,
  );
  TestValidator.equals("phone updated", updated.phone, newPhone);
  TestValidator.equals(
    "kyc_document_uri updated",
    updated.kyc_document_uri,
    newKyc,
  );
  TestValidator.equals(
    "approval_status updated",
    updated.approval_status,
    newApprovalStatus,
  );
  TestValidator.equals(
    "business_registration_number updated",
    updated.business_registration_number,
    newBusinessRegNum,
  );
  TestValidator.equals(
    "email_verified updated",
    updated.email_verified,
    newEmailVerified,
  );

  // 7. Validate updated_at changed (audit)
  TestValidator.notEquals(
    "updated_at is refreshed after update",
    updated.updated_at,
    seller.updated_at,
  );

  // 8. Error: set invalid phone
  await TestValidator.error("reject invalid phone number format", async () => {
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: seller.id,
      body: { phone: "123" } satisfies IShoppingMallSeller.IUpdate,
    });
  });

  // 9. Error: duplicate business_registration_number
  const dupeSellerEmail = typia.random<string & tags.Format<"email">>();
  const dupeSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: dupeSellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: "BRN-" + RandomGenerator.alphaNumeric(8),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(dupeSeller);
  await TestValidator.error(
    "cannot set duplicate business_registration_number",
    async () => {
      await api.functional.shoppingMall.admin.sellers.update(connection, {
        sellerId: dupeSeller.id,
        body: {
          business_registration_number: newBusinessRegNum,
        } satisfies IShoppingMallSeller.IUpdate,
      });
    },
  );

  // 10. Status transition logic: approve→suspend, suspend→rejected, rejected→pending
  const statusCases: string[] = [
    "approved",
    "suspended",
    "rejected",
    "pending",
  ];
  for (let i = 1; i < statusCases.length; ++i) {
    const prevStatus = statusCases[i - 1];
    const nextStatus = statusCases[i];
    const changed: IShoppingMallSeller =
      await api.functional.shoppingMall.admin.sellers.update(connection, {
        sellerId: seller.id,
        body: {
          approval_status: nextStatus,
        } satisfies IShoppingMallSeller.IUpdate,
      });
    typia.assert(changed);
    TestValidator.equals(
      `approval_status transition ${prevStatus}->${nextStatus}`,
      changed.approval_status,
      nextStatus,
    );
  }

  // 11. Attempt update on deleted seller
  const deletedAt = new Date().toISOString();
  await api.functional.shoppingMall.admin.sellers.update(connection, {
    sellerId: seller.id,
    body: { deleted_at: deletedAt } satisfies IShoppingMallSeller.IUpdate,
  });
  await TestValidator.error("cannot update a deleted seller", async () => {
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: seller.id,
      body: {
        business_name: "SHOULD NOT WORK",
      } satisfies IShoppingMallSeller.IUpdate,
    });
  });
}
