// Phone photos are 3-10MB. Shrinking to 1024px JPEG in the browser makes the upload
// ~100-300KB, makes the AI call faster and cheaper, and means the full-size photo never leaves the phone.
export async function shrinkPhoto(file: File, maxSide = 1024) {
  const bitmap = await createImageBitmap(file); // also applies the phone's rotation info
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return { dataUrl, base64: dataUrl.split(",")[1] };
}
