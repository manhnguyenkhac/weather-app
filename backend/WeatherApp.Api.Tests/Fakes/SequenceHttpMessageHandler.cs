using System.Net;
using System.Text;

namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// HttpMessageHandler giả trả lần lượt từng response trong dãy; hết dãy thì lặp lại response cuối.
/// Dùng cho test retry/serve-stale — mô phỏng upstream lúc chết lúc sống.
/// </summary>
public sealed class SequenceHttpMessageHandler(params (HttpStatusCode StatusCode, string Body)[] responses) : HttpMessageHandler
{
    public int RequestCount { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var (statusCode, body) = responses[Math.Min(RequestCount, responses.Length - 1)];
        RequestCount++;

        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        return Task.FromResult(response);
    }
}
