import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSetting";
import type { IShoppingMallPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSettings";

/**
 * Validate that admin-only access returns correct mall config details and
 * blocks unauthorized users
 *
 * This test ensures that an authenticated admin can: (1) register; (2) create a
 * detailed platform setting; (3) retrieve that setting by ID with all expected
 * fields; (4) confirm all critical properties match what was created (titles
 * ko/en, descriptions, contact/support/brand URIs, legal links); (5) verify
 * that unauthenticated access to the setting detail is not permitted. The test
 * covers both success and unauthorized/error flows for platform admin
 * configuration access.
 */
export async function test_api_platform_setting_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // 2. Create a platform setting as the authenticated admin
  const platformSettingCreate = {
    site_title_ko: RandomGenerator.paragraph({ sentences: 2 }),
    site_title_en: RandomGenerator.paragraph({ sentences: 2 }),
    site_description_ko: RandomGenerator.content({ paragraphs: 1 }),
    site_description_en: RandomGenerator.content({ paragraphs: 1 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
    branding_logo_uri: "https://cdn.example.com/brand/logo.png",
    privacy_policy_uri: "https://cdn.example.com/policy/privacy.html",
    terms_of_service_uri: "https://cdn.example.com/policy/terms.html",
  } satisfies IShoppingMallPlatformSettings.ICreate;

  const createdSetting =
    await api.functional.shoppingMall.admin.platformSettings.create(
      connection,
      { body: platformSettingCreate },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "created config ko title",
    createdSetting.site_title_ko,
    platformSettingCreate.site_title_ko,
  );
  TestValidator.equals(
    "created config en title",
    createdSetting.site_title_en,
    platformSettingCreate.site_title_en,
  );
  TestValidator.equals(
    "created config ko desc",
    createdSetting.site_description_ko,
    platformSettingCreate.site_description_ko,
  );
  TestValidator.equals(
    "created config en desc",
    createdSetting.site_description_en,
    platformSettingCreate.site_description_en,
  );
  TestValidator.equals(
    "created config support email",
    createdSetting.support_email,
    platformSettingCreate.support_email,
  );
  TestValidator.equals(
    "created config support phone",
    createdSetting.support_phone,
    platformSettingCreate.support_phone,
  );
  TestValidator.equals(
    "created config logo uri",
    createdSetting.branding_logo_uri,
    platformSettingCreate.branding_logo_uri,
  );
  TestValidator.equals(
    "created config privacy uri",
    createdSetting.privacy_policy_uri,
    platformSettingCreate.privacy_policy_uri,
  );
  TestValidator.equals(
    "created config tos uri",
    createdSetting.terms_of_service_uri,
    platformSettingCreate.terms_of_service_uri,
  );

  // 3. Admin: Retrieve the setting by ID and validate returned details
  const settingDetail =
    await api.functional.shoppingMall.admin.platformSettings.at(connection, {
      platformSettingId: createdSetting.id,
    });
  typia.assert(settingDetail);
  TestValidator.equals(
    "detail ko title",
    settingDetail.site_title_ko,
    platformSettingCreate.site_title_ko,
  );
  TestValidator.equals(
    "detail en title",
    settingDetail.site_title_en,
    platformSettingCreate.site_title_en,
  );
  TestValidator.equals(
    "detail ko desc",
    settingDetail.site_description_ko,
    platformSettingCreate.site_description_ko,
  );
  TestValidator.equals(
    "detail en desc",
    settingDetail.site_description_en,
    platformSettingCreate.site_description_en,
  );
  TestValidator.equals(
    "detail support email",
    settingDetail.support_email,
    platformSettingCreate.support_email,
  );
  TestValidator.equals(
    "detail support phone",
    settingDetail.support_phone,
    platformSettingCreate.support_phone,
  );
  TestValidator.equals(
    "detail branding logo uri",
    settingDetail.branding_logo_uri,
    platformSettingCreate.branding_logo_uri,
  );
  TestValidator.equals(
    "detail privacy uri",
    settingDetail.privacy_policy_uri,
    platformSettingCreate.privacy_policy_uri,
  );
  TestValidator.equals(
    "detail tos uri",
    settingDetail.terms_of_service_uri,
    platformSettingCreate.terms_of_service_uri,
  );
  TestValidator.predicate(
    "detail id matches created",
    settingDetail.id === createdSetting.id,
  );

  // 4. Unauthenticated: Try accessing detail as unauth connection and expect error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated platform setting detail access throws",
    async () => {
      await api.functional.shoppingMall.admin.platformSettings.at(
        unauthConnection,
        {
          platformSettingId: createdSetting.id,
        },
      );
    },
  );
}
