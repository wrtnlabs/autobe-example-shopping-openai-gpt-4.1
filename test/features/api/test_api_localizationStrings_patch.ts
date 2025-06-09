import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageILocalizationString } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageILocalizationString";
import { ILocalizationString } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationString";

export async function test_api_localizationStrings_patch(
  connection: api.IConnection,
) {
  const output: IPageILocalizationString =
    await api.functional.localizationStrings.patch(connection, {
      body: typia.random<ILocalizationString.IRequest>(),
    });
  typia.assert(output);
}
