import { supabase } from "./supabase";

export async function uploadOrderSupportFile(file: File) {
  const fileExt = file.name.split(".").pop();

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;

  const filePath = `orders/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("order-supports")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from("order-supports")
    .getPublicUrl(filePath);

  return {
    fileName,
    fileUrl: data.publicUrl,
  };
}