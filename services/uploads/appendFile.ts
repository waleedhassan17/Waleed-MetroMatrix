import { Platform } from 'react-native';

export interface PickedFile {
  /** file:// or content:// on native; blob: or data: in a browser. */
  uri: string;
  name: string;
  /** MIME type. */
  type: string;
}

/**
 * Append a picked file to multipart form data, on every platform.
 *
 * React Native's FormData takes `{ uri, name, type }` and streams the file
 * from disk. A browser's FormData does not know that shape: it stringified the
 * object, the server received the text "[object Object]" in place of the
 * file, and every upload from the web build failed. In a browser the picker's
 * uri is a blob: or data: URL, which fetch() turns into the Blob a browser can
 * send.
 */
export async function appendFile(
  form: FormData,
  field: string,
  file: PickedFile,
  os: string = Platform.OS
): Promise<void> {
  if (os !== 'web') {
    form.append(field, file as any);
    return;
  }
  const blob = await (await fetch(file.uri)).blob();
  // A blob: URL can come back untyped; the server checks the MIME type.
  form.append(field, blob.type ? blob : new Blob([blob], { type: file.type }), file.name);
}
