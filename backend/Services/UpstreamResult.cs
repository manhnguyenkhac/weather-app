namespace WeatherApp.Api.Services;

/// <summary>
/// Kết quả gọi upstream có phân biệt độ tươi:
/// - Data null → upstream lỗi và không có bản cache cũ nào (endpoint map thành 502).
/// - IsStale true → upstream lỗi nhưng còn bản cũ trong stale horizon (endpoint trả 200 + header X-Data-Stale).
/// </summary>
public sealed record UpstreamResult<T>(T? Data, bool IsStale) where T : class
{
    public static UpstreamResult<T> Fresh(T data) => new(data, false);

    public static UpstreamResult<T> Stale(T data) => new(data, true);

    public static UpstreamResult<T> Failed() => new(null, false);
}
