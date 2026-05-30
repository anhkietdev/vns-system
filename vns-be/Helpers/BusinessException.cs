namespace VNS.API.Helpers
{
    public class BusinessException : Exception
    {
        public int StatusCode { get; }
        public BusinessException(string message, int statusCode = 400) : base(message)
        {
            StatusCode = statusCode;
        }
    }

    public class NotFoundException : BusinessException
    {
        public NotFoundException(string message) : base(message, 404) { }
    }
}
