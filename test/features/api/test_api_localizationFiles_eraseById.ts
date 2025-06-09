import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ILocalizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationFile";

export async function test_api_localizationFiles_eraseById(
  connection: api.IConnection,
) {
  const output: ILocalizationFile =
    await api.functional.localizationFiles.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
