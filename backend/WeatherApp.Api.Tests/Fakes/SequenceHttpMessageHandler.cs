using System.Net;
using System.Text;

namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// HttpMessageHandler giả trả lần lượt từng response trong dãy; hết dãy thì lặp lại response cuối.
/// Dùng cho test retry/serve-stale — mô phỏng upstream lúc chết lúc sống.
/// </summary>
public sealed class SequenceHttpMessageHandler(params (HttpStatusCode StatusCode, string Body)[] responses) : HttpMessageHandler
{
    private int requestCount;

    public int RequestCount => requestCount;

    /// <summary>Giữ response lại một nhịp — test single-flight cần cửa sổ để các request chồng nhau.</summary>
    public TimeSpan Delay { get; set; } = TimeSpan.Zero;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var index = Interlocked.Increment(ref requestCount) - 1;
        var (statusCode, body) = responses[Math.Min(index, responses.Length - 1)];

        if (Delay > TimeSpan.Zero)
        {
            await Task.Delay(Delay, cancellationToken);
        }

        return new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
    }
}
