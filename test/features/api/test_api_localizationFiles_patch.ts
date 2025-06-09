import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageILocalizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageILocalizationFile";
import { ILocalizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationFile";

export async function test_api_localizationFiles_patch(
  connection: api.IConnection,
) {
  const output: IPageILocalizationFile =
    await api.functional.localizationFiles.patch(connection, {
      body: typia.random<ILocalizationFile.IRequest>(),
    });
  typia.assert(output);
}
