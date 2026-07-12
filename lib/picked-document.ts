export type PickedDocument = {
  uri: string;
  name: string;
  mimeType: string;
};

export function appendDocumentToFormData(formData: FormData, fieldName: string, doc: PickedDocument) {
  formData.append(fieldName, {
    uri: doc.uri,
    name: doc.name,
    type: doc.mimeType,
  } as unknown as Blob);
}
