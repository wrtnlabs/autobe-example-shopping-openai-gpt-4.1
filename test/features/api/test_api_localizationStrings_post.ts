import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ILocalizationString } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationString";

export async function test_api_localizationStrings_post(
  connection: api.IConnection,
) {
  const output: ILocalizationString =
    await api.functional.localizationStrings.post(connection, {
      body: typia.random<ILocalizationString.ICreate>(),
    });
  typia.assert(output);
}
