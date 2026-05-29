import { EntryEditorForm } from "@/components/EntryEditorForm";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EntryEditorForm id={id} />;
}
