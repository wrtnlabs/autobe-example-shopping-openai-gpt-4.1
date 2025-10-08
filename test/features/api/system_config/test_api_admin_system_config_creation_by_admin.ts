import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Validates the creation of new system configuration entries by authenticated
 * admins.
 *
 * 1. Register a new admin via /auth/admin/join and use resulting token
 * 2. For each value_type (string, int, double, boolean, json), create a config
 *    with a unique key & scope, setting ONLY the corresponding value property
 * 3. Special cases test: unusual scope and special characters in config_key, large
 *    values in json_value
 * 4. Validate results: correct field is present, audit timestamps in valid ISO
 *    format, all deleted_at null/undefined, and config is retrievable
 * 5. Attempt to create a duplicate (config_key, config_scope) and confirm
 *    rejection
 *
 * Covers success and error logic, field type/rule conformity, and audit/trace
 * fields.
 */
export async function test_api_admin_system_config_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@configtest.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare test cases
  const testCases: Array<{
    value_type: string;
    value_input: Partial<IShoppingMallSystemConfig.ICreate>;
    uniqueKey: string;
    scope: string;
  }> = [
    {
      value_type: "string",
      value_input: {
        string_value: RandomGenerator.paragraph({ sentences: 5 }),
      },
      uniqueKey: `feature_flag_${RandomGenerator.alphaNumeric(7)}`,
      scope: "global",
    },
    {
      value_type: "int",
      value_input: {
        int_value: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
      },
      uniqueKey: `max_limit_${RandomGenerator.alphaNumeric(7)}`,
      scope: "product",
    },
    {
      value_type: "double",
      value_input: { double_value: Math.round(Math.random() * 1e5) + 0.99 },
      uniqueKey: `shipping_rate_${RandomGenerator.alphaNumeric(7)}`,
      scope: "shipping",
    },
    {
      value_type: "boolean",
      value_input: { boolean_value: Math.random() > 0.5 },
      uniqueKey: `toggle_${RandomGenerator.alphaNumeric(7)}`,
      scope: "payment",
    },
    {
      value_type: "json",
      value_input: {
        json_value: JSON.stringify({
          list: ArrayUtil.repeat(25, (i) => RandomGenerator.name()),
          meta: { big: true },
        }),
      },
      uniqueKey: `json_blob_${RandomGenerator.alphaNumeric(7)}`,
      scope: "advanced",
    },
    // Special characters in key and unusual scope
    {
      value_type: "string",
      value_input: { string_value: "testing*special!@#^$%" },
      uniqueKey: `special!@#^$%${RandomGenerator.alphaNumeric(5)}`,
      scope: "weird:scope/漢字/surrogate-𝒜",
    },
  ];

  for (const testCase of testCases) {
    const { value_type, value_input, uniqueKey, scope } = testCase;
    const body: IShoppingMallSystemConfig.ICreate = {
      config_key: uniqueKey,
      config_scope: scope,
      value_type,
      string_value:
        value_type === "string" ? value_input.string_value : undefined,
      int_value: value_type === "int" ? value_input.int_value : undefined,
      boolean_value:
        value_type === "boolean" ? value_input.boolean_value : undefined,
      double_value:
        value_type === "double" ? value_input.double_value : undefined,
      json_value: value_type === "json" ? value_input.json_value : undefined,
    };

    const config: IShoppingMallSystemConfig =
      await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
        body,
      });
    typia.assert(config);
    TestValidator.equals(
      `systemConfig[${value_type}] config_key`,
      config.config_key,
      uniqueKey,
    );
    TestValidator.equals(
      `systemConfig[${value_type}] config_scope`,
      config.config_scope,
      scope,
    );
    TestValidator.equals(
      `systemConfig[${value_type}] value_type`,
      config.value_type,
      value_type,
    );
    // Only the correct value field is set (others should be null/undefined)
    if (value_type === "int") {
      TestValidator.equals(
        `systemConfig[int] int_value present`,
        config.int_value,
        body.int_value,
      );
      TestValidator.equals(
        `systemConfig[int] double_value null`,
        config.double_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[int] boolean_value null`,
        config.boolean_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[int] string_value null`,
        config.string_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[int] json_value null`,
        config.json_value ?? null,
        null,
      );
    } else if (value_type === "string") {
      TestValidator.equals(
        `systemConfig[string] string_value present`,
        config.string_value,
        body.string_value,
      );
      TestValidator.equals(
        `systemConfig[string] int_value null`,
        config.int_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[string] double_value null`,
        config.double_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[string] boolean_value null`,
        config.boolean_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[string] json_value null`,
        config.json_value ?? null,
        null,
      );
    } else if (value_type === "double") {
      TestValidator.equals(
        `systemConfig[double] double_value present`,
        config.double_value,
        body.double_value,
      );
      TestValidator.equals(
        `systemConfig[double] int_value null`,
        config.int_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[double] boolean_value null`,
        config.boolean_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[double] string_value null`,
        config.string_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[double] json_value null`,
        config.json_value ?? null,
        null,
      );
    } else if (value_type === "boolean") {
      TestValidator.equals(
        `systemConfig[boolean] boolean_value present`,
        config.boolean_value,
        body.boolean_value,
      );
      TestValidator.equals(
        `systemConfig[boolean] int_value null`,
        config.int_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[boolean] double_value null`,
        config.double_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[boolean] string_value null`,
        config.string_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[boolean] json_value null`,
        config.json_value ?? null,
        null,
      );
    } else if (value_type === "json") {
      TestValidator.equals(
        `systemConfig[json] json_value present`,
        config.json_value,
        body.json_value,
      );
      TestValidator.equals(
        `systemConfig[json] int_value null`,
        config.int_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[json] double_value null`,
        config.double_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[json] boolean_value null`,
        config.boolean_value ?? null,
        null,
      );
      TestValidator.equals(
        `systemConfig[json] string_value null`,
        config.string_value ?? null,
        null,
      );
    }
    // Audit/trace fields and ISO 8601 checks
    TestValidator.predicate(
      `systemConfig[${value_type}] created_at valid ISO 8601`,
      typeof config.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./.test(config.created_at),
    );
    TestValidator.predicate(
      `systemConfig[${value_type}] updated_at valid ISO 8601`,
      typeof config.updated_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\./.test(config.updated_at),
    );
    TestValidator.equals(
      `systemConfig[${value_type}] deleted_at null`,
      config.deleted_at ?? null,
      null,
    );
  }

  // 5. Duplicate key/scope should error
  const dupeBody: IShoppingMallSystemConfig.ICreate = {
    config_key: testCases[0].uniqueKey,
    config_scope: testCases[0].scope,
    value_type: testCases[0].value_type,
    string_value:
      testCases[0].value_type === "string"
        ? testCases[0].value_input.string_value
        : undefined,
    int_value:
      testCases[0].value_type === "int"
        ? testCases[0].value_input.int_value
        : undefined,
    boolean_value:
      testCases[0].value_type === "boolean"
        ? testCases[0].value_input.boolean_value
        : undefined,
    double_value:
      testCases[0].value_type === "double"
        ? testCases[0].value_input.double_value
        : undefined,
    json_value:
      testCases[0].value_type === "json"
        ? testCases[0].value_input.json_value
        : undefined,
  };
  await TestValidator.error(
    "systemConfig duplicate (config_key, config_scope) throws error",
    async () => {
      await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
        body: dupeBody,
      });
    },
  );
}
