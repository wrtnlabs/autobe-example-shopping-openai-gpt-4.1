import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSettings";

/**
 * Validates update of platform-wide settings as admin, including permission
 * enforcement and error handling.
 *
 * Steps:
 *
 * 1. Register as a new admin (acquire admin authentication)
 * 2. Create initial platform setting record
 * 3. Update platform setting with new values (titles, descriptions, support,
 *    branding, legal URIs)
 * 4. Fetch the updated record and verify changes
 * 5. Attempt update of non-existent (random) platformSettingId and expect error
 * 6. Attempt update as non-admin by clearing auth (headers) and expect
 *    forbidden/error
 */
export async function test_api_platform_settings_admin_update(
  connection: api.IConnection,
) {
  // 1. Register as a new admin (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create initial platform setting record (as admin)
  const initialSettingsBody = {
    site_title_ko: RandomGenerator.name(2),
    site_title_en: RandomGenerator.name(2),
    site_description_ko: RandomGenerator.paragraph({ sentences: 5 }),
    site_description_en: RandomGenerator.paragraph({ sentences: 5 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
    branding_logo_uri: "https://cdn.example.com/logo.png",
    privacy_policy_uri: "https://shop.example.com/privacy",
    terms_of_service_uri: "https://shop.example.com/terms",
  } satisfies IShoppingMallPlatformSettings.ICreate;
  const initialSettings: IShoppingMallPlatformSettings =
    await api.functional.shoppingMall.admin.platformSettings.create(
      connection,
      {
        body: initialSettingsBody,
      },
    );
  typia.assert(initialSettings);

  // 3. Update platform setting with new values
  const updateBody = {
    site_title_ko: RandomGenerator.name(3),
    site_title_en: RandomGenerator.name(3),
    site_description_ko: RandomGenerator.paragraph({ sentences: 3 }),
    site_description_en: RandomGenerator.paragraph({ sentences: 3 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
    branding_logo_uri: "https://cdn-updated.example.com/logo-updated.png",
    privacy_policy_uri: "https://shop.example.com/privacy/v2",
    terms_of_service_uri: "https://shop.example.com/terms/v2",
  } satisfies IShoppingMallPlatformSettings.IUpdate;
  const updated: IShoppingMallPlatformSettings =
    await api.functional.shoppingMall.admin.platformSettings.update(
      connection,
      {
        platformSettingId: initialSettings.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "site_title_ko updated",
    updated.site_title_ko,
    updateBody.site_title_ko,
  );
  TestValidator.equals(
    "site_title_en updated",
    updated.site_title_en,
    updateBody.site_title_en,
  );
  TestValidator.equals(
    "site_description_ko updated",
    updated.site_description_ko,
    updateBody.site_description_ko,
  );
  TestValidator.equals(
    "site_description_en updated",
    updated.site_description_en,
    updateBody.site_description_en,
  );
  TestValidator.equals(
    "support_email updated",
    updated.support_email,
    updateBody.support_email,
  );
  TestValidator.equals(
    "support_phone updated",
    updated.support_phone,
    updateBody.support_phone,
  );
  TestValidator.equals(
    "branding_logo_uri updated",
    updated.branding_logo_uri,
    updateBody.branding_logo_uri,
  );
  TestValidator.equals(
    "privacy_policy_uri updated",
    updated.privacy_policy_uri,
    updateBody.privacy_policy_uri,
  );
  TestValidator.equals(
    "terms_of_service_uri updated",
    updated.terms_of_service_uri,
    updateBody.terms_of_service_uri,
  );

  // 4. Update with non-existent id should error
  await TestValidator.error(
    "update non-existent platformSettingId should fail",
    async () => {
      await api.functional.shoppingMall.admin.platformSettings.update(
        connection,
        {
          platformSettingId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 5. Update with unauthenticated connection (simulate non-admin) should error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin update forbidden", async () => {
    await api.functional.shoppingMall.admin.platformSettings.update(
      unauthConn,
      {
        platformSettingId: initialSettings.id,
        body: updateBody,
      },
    );
  });
}
