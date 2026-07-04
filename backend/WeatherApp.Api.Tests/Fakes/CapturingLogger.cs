using Microsoft.Extensions.Logging;

namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// ILogger giả gom lại (level, message đã format) để test khẳng định hành vi logging.
/// </summary>
public sealed class CapturingLogger<T> : ILogger<T>
{
    public List<(LogLevel Level, string Message)> Entries { get; } = [];

    public IReadOnlyList<string> Messages(LogLevel level) =>
        Entries.Where(e => e.Level == level).Select(e => e.Message).ToList();

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
        Entries.Add((logLevel, formatter(state, exception)));
}
