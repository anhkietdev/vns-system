using Microsoft.AspNetCore.Http;

namespace VNS.API.Services.Interfaces
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file, string folder = "vns");
        Task<List<string>> UploadImagesAsync(List<IFormFile> files, string folder = "vns");
        Task<bool> DeleteImageAsync(string publicId);
    }
}
