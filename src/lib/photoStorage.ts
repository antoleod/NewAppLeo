import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const backgroundPhotoRef = (uid: string) => ref(storage, `users/${uid}/backgroundPhoto.jpg`);

export async function uploadBackgroundPhoto(uid: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  await uploadBytes(backgroundPhotoRef(uid), blob, { contentType: 'image/jpeg' });
  return getDownloadURL(backgroundPhotoRef(uid));
}

export async function deleteBackgroundPhoto(uid: string): Promise<void> {
  try {
    await deleteObject(backgroundPhotoRef(uid));
  } catch {
    // file may not exist yet — ignore
  }
}
