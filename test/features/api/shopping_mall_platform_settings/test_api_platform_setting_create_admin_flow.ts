import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSettings";

/**
 * Validate the end-to-end creation flow of platform-wide settings by an admin.
 *
 * Steps:
 *
 * 1. Register (join) a new admin user and obtain authentication.
 * 2. Prepare a valid platform settings creation request (localized titles,
 *    descriptions, branding/logo URI, support contacts, privacy and terms
 *    links).
 * 3. As authenticated admin, create the setting and verify the response matches
 *    input plus audit fields.
 * 4. Attempt creation of a second/duplicate setting to test singleton enforcement
 *    (expect error if applicable).
 * 5. Attempt creation when unauthenticated and verify 401 error.
 */
export async function test_api_platform_setting_create_admin_flow(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        full_name: RandomGenerator.name(),
        status: undefined,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare platform settings creation input
  const platformSettingsBody = {
    site_title_ko: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 2,
      wordMax: 8,
    }),
    site_title_en: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 2,
      wordMax: 10,
    }),
    site_description_ko: RandomGenerator.paragraph({ sentences: 8 }),
    site_description_en: RandomGenerator.paragraph({ sentences: 6 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
    branding_logo_uri: typia.random<string & tags.Format<"uri">>(),
    privacy_policy_uri: typia.random<string & tags.Format<"uri">>(),
    terms_of_service_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformSettings.ICreate;

  // 3. As authenticated admin, create platform settings
  const setting: IShoppingMallPlatformSettings =
    await api.functional.shoppingMall.admin.platformSettings.create(
      connection,
      {
        body: platformSettingsBody,
      },
    );
  typia.assert(setting);

  // 3a. Validate that response matches input
  TestValidator.equals(
    "site_title_ko matches",
    setting.site_title_ko,
    platformSettingsBody.site_title_ko,
  );
  TestValidator.equals(
    "site_title_en matches",
    setting.site_title_en,
    platformSettingsBody.site_title_en,
  );
  TestValidator.equals(
    "site_description_ko matches",
    setting.site_description_ko,
    platformSettingsBody.site_description_ko,
  );
  TestValidator.equals(
    "site_description_en matches",
    setting.site_description_en,
    platformSettingsBody.site_description_en,
  );
  TestValidator.equals(
    "support_email matches",
    setting.support_email,
    platformSettingsBody.support_email,
  );
  TestValidator.equals(
    "support_phone matches",
    setting.support_phone,
    platformSettingsBody.support_phone,
  );
  TestValidator.equals(
    "branding_logo_uri matches",
    setting.branding_logo_uri,
    platformSettingsBody.branding_logo_uri,
  );
  TestValidator.equals(
    "privacy_policy_uri matches",
    setting.privacy_policy_uri,
    platformSettingsBody.privacy_policy_uri,
  );
  TestValidator.equals(
    "terms_of_service_uri matches",
    setting.terms_of_service_uri,
    platformSettingsBody.terms_of_service_uri,
  );

  // Ensure audit fields present
  TestValidator.predicate(
    "created_at exists (date-time)",
    typeof setting.created_at === "string" && !!setting.created_at,
  );
  TestValidator.predicate(
    "updated_at exists (date-time)",
    typeof setting.updated_at === "string" && !!setting.updated_at,
  );

  // 4. Attempt to create another setting to check singleton enforcement (if enforced by backend)
  await TestValidator.error(
    "duplicate active settings not allowed",
    async () => {
      await api.functional.shoppingMall.admin.platformSettings.create(
        connection,
        {
          body: platformSettingsBody,
        },
      );
    },
  );

  // 5. Attempt platform settings creation as unauthenticated (should receive 401 unauthorized)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot create settings (401)",
    async () => {
      await api.functional.shoppingMall.admin.platformSettings.create(
        unauthConn,
        {
          body: platformSettingsBody,
        },
      );
    },
  );
}
