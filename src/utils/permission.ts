export async function verifyPermission(fileHandle: FileSystemFileHandle, readWrite: boolean = false): Promise<boolean> {
  const options = {
    mode: (readWrite ? 'readwrite' : 'read') as any,
  };
  
  // @ts-ignore
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // @ts-ignore
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
}

export function bindSilentReauth() {
   // In a complete implementation, this would loop through all cached FileSystemHandles
   // and request permission on the first user interaction (e.g. any click)
   // to prevent the permission lock from breaking offline reloads.
   
   let resolved = false;

   const handler = async () => {
       if (resolved) return;
       try {
           // Example logic would iterate IndexedDB stored handles here
           resolved = true;
           document.removeEventListener('click', handler);
           document.removeEventListener('keydown', handler);
       } catch (e) {
           console.error("Silent Re-Auth Failed", e);
       }
   };

   document.addEventListener('click', handler);
   document.addEventListener('keydown', handler);
}
