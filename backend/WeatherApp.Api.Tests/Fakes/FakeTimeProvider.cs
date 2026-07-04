namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// TimeProvider chỉnh được giờ bằng tay — test serve-stale tua thời gian qua TTL tươi/stale horizon
/// mà không phải chờ thật.
/// </summary>
public sealed class FakeTimeProvider(DateTimeOffset start) : TimeProvider
{
    public DateTimeOffset UtcNow { get; set; } = start;

    public override DateTimeOffset GetUtcNow() => UtcNow;

    public void Advance(TimeSpan delta) => UtcNow += delta;
}
