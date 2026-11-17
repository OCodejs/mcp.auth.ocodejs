export function createPreviewSchema(source) {
  const datasource = source.match(/datasource\s+db\s*\{[\s\S]*?\n\}/);
  if (!datasource) throw new Error("Prisma datasource block was not found.");

  const previewDatasource = datasource[0].replace(
    /\n\}$/,
    '\n  schemas = ["public", "auth_preview"]\n}'
  );
  let output = source.replace(datasource[0], previewDatasource);
  let modelCount = 0;

  output = output.replace(/(^model\s+\w+\s*\{[\s\S]*?)(^\})/gm, (_match, body, close) => {
    modelCount += 1;
    return `${body.trimEnd()}\n  @@schema("auth_preview")\n${close}`;
  });

  if (modelCount === 0) throw new Error("No Prisma models were found.");
  return output;
}
