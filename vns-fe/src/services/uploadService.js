import { apiUpload } from "./api";

export const uploadService = {
  // POST /api/Upload/image (FormData: file, folder)
  async uploadImage(file, folder) {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) formData.append("folder", folder);
    return apiUpload("/api/Upload/image", formData);
  },

  // POST /api/Upload/images (FormData: multiple files, folder)
  async uploadImages(files, folder) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    if (folder) formData.append("folder", folder);
    try {
      return await apiUpload("/api/Upload/images", formData);
    } catch (error) {
      if (error?.status !== 404) {
        throw error;
      }

      const uploads = await Promise.all(
        files.map((file) => this.uploadImage(file, folder))
      );

      const urls = uploads
        .map((response) => response?.data?.url ?? response?.url ?? null)
        .filter(Boolean);

      return {
        success: true,
        data: { urls },
      };
    }
  },
};
