import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ILocalizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationFile";

export async function test_api_localizationFiles_putById(
  connection: api.IConnection,
) {
  const output: ILocalizationFile =
    await api.functional.localizationFiles.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ILocalizationFile.IUpdate>(),
    });
  typia.assert(output);
}
