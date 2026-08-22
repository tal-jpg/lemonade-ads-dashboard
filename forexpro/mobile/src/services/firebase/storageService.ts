import { ref, putFile, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { storage } from './client';
import { storagePaths } from './paths';
import { serviceError } from '../../utils/errors';
import { log } from '../../utils/logger';

/**
 * Media uploads.
 *
 * Paths mirror storage.rules exactly, so an upload that would be rejected is
 * impossible to construct from here. Every call reports progress so the UI can
 * show a real bar rather than an indeterminate spinner.
 */

export type UploadProgress = (fraction: number) => void;

function extensionOf(uri: string, fallback: string): string {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot === clean.length - 1) return fallback;
  const ext = clean.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : fallback;
}

async function upload(path: string, localUri: string, onProgress?: UploadProgress): Promise<string> {
  const reference = ref(storage(), path);
  const task = putFile(reference, localUri);

  if (onProgress) {
    task.on('state_changed', (snapshot) => {
      if (snapshot.totalBytes > 0) {
        onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
      }
    });
  }

  await task;
  return getDownloadURL(reference);
}

export async function uploadAvatar(
  uid: string,
  localUri: string,
  onProgress?: UploadProgress,
): Promise<string> {
  try {
    return await upload(storagePaths.avatar(uid, extensionOf(localUri, 'jpg')), localUri, onProgress);
  } catch (err) {
    throw serviceError(err, 'Could not upload your picture. Please try again.');
  }
}

export async function uploadCommunityImage(
  uid: string,
  id: string,
  localUri: string,
  onProgress?: UploadProgress,
): Promise<string> {
  try {
    return await upload(
      storagePaths.communityImage(uid, id, extensionOf(localUri, 'jpg')),
      localUri,
      onProgress,
    );
  } catch (err) {
    throw serviceError(err, 'Could not send the photo.');
  }
}

export async function uploadCommunityVideo(
  uid: string,
  id: string,
  localUri: string,
  onProgress?: UploadProgress,
): Promise<string> {
  try {
    return await upload(
      storagePaths.communityVideo(uid, id, extensionOf(localUri, 'mp4')),
      localUri,
      onProgress,
    );
  } catch (err) {
    throw serviceError(err, 'Could not send the video.');
  }
}

export async function uploadVoiceNote(
  uid: string,
  id: string,
  localUri: string,
  onProgress?: UploadProgress,
): Promise<string> {
  try {
    return await upload(
      storagePaths.communityAudio(uid, id, extensionOf(localUri, 'm4a')),
      localUri,
      onProgress,
    );
  } catch (err) {
    throw serviceError(err, 'Could not send the voice note.');
  }
}

export async function uploadDocument(
  uid: string,
  id: string,
  localUri: string,
  fileName: string,
  onProgress?: UploadProgress,
): Promise<string> {
  try {
    const safeName = fileName.replace(/[^\w.\-]/g, '_').slice(0, 60);
    return await upload(storagePaths.communityFile(uid, id, safeName), localUri, onProgress);
  } catch (err) {
    throw serviceError(err, 'Could not send the file.');
  }
}

export async function deleteAtPath(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage(), path));
  } catch (err) {
    // A missing object is not an error worth surfacing.
    log.warn('storage delete failed', err);
  }
}
