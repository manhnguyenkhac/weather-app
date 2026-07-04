namespace WeatherApp.Api.Endpoints;

/// <summary>
/// 200 OK có đánh dấu dữ liệu cũ: khi upstream chết nhưng còn cache trong stale horizon (#61),
/// response kèm header <c>X-Data-Stale: true</c> để client biết đây là bản cũ.
/// Đường fresh trả thẳng Results.Ok — giữ nguyên kiểu Ok&lt;T&gt; cho test hiện có.
/// </summary>
public static class StaleOk
{
    public static IResult Ok<T>(T value, bool isStale) =>
        isStale ? new StaleOkResult<T>(value) : Results.Ok(value);
}

public sealed class StaleOkResult<T>(T value) : IResult
{
    public T Value => value;

    public async Task ExecuteAsync(HttpContext httpContext)
    {
        httpContext.Response.Headers["X-Data-Stale"] = "true";
        await Results.Ok(value).ExecuteAsync(httpContext);
    }
}
