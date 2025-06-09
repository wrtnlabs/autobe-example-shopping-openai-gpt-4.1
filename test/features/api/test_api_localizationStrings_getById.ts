import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ILocalizationString } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationString";

export async function test_api_localizationStrings_getById(
  connection: api.IConnection,
) {
  const output: ILocalizationString =
    await api.functional.localizationStrings.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
