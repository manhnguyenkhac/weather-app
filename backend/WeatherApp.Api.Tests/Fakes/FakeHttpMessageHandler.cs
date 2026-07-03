using System.Net;
using System.Text;

namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// HttpMessageHandler giả cho unit test: trả response cấu hình sẵn và ghi lại URL đã được gọi.
/// </summary>
public sealed class FakeHttpMessageHandler(HttpStatusCode statusCode, string body, string contentType = "application/json") : HttpMessageHandler
{
    public Uri? LastRequestUri { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequestUri = request.RequestUri;

        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(body, Encoding.UTF8, contentType),
        };
        return Task.FromResult(response);
    }
}
