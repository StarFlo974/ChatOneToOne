import * as FileSystem from "expo-file-system/legacy";

const STORAGE_DIR = `${FileSystem.documentDirectory}echochat/`;

async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
  }
}

export async function saveItem<T>(key: string, value: T) {
  try {
    await ensureDir();
    const path = STORAGE_DIR + key + ".json";
    await FileSystem.writeAsStringAsync(path, JSON.stringify(value));
  } catch (e) {
    console.log("saveItem error", e);
  }
}

export async function loadItem<T>(key: string): Promise<T | null> {
  try {
    const path = STORAGE_DIR + key + ".json";
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(path);
    return JSON.parse(content) as T;
  } catch (e) {
    console.log("loadItem error", e);
    return null;
  }
}