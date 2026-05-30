using VNS.API.Helpers;

namespace VNS.API.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (BusinessException ex)
            {
                context.Response.StatusCode = ex.StatusCode;
                context.Response.ContentType = "application/json";
                var response = ApiResponse<object>.ErrorResponse(ex.Message);
                await context.Response.WriteAsJsonAsync(response);
            }
            catch (Exception ex)
            {
                var path = $"{context.Request.Method} {context.Request.Path}{context.Request.QueryString}";
                _logger.LogError(ex, "Unhandled exception on {Path}", path);
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                var message = $"{ex.GetType().Name}: {ex.Message}";
                if (ex.InnerException != null)
                    message += $" ? {ex.InnerException.Message}";
                var response = ApiResponse<object>.ErrorResponse($"[{path}] {message}");
                await context.Response.WriteAsJsonAsync(response);
            }
        }
    }
}
