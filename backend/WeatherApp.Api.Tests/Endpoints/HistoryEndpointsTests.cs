using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Models;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Endpoints;

public class HistoryEndpointsTests
{
    private static readonly (double Lat, double Lon) HaNoi = (21.0278, 105.8342);

    // "Hôm nay" cố định cho mọi test — 2026-07-04
    private static readonly FakeTimeProvider Time = new(new DateTimeOffset(2026, 7, 4, 10, 0, 0, TimeSpan.Zero));

    /// <summary>Body archive hợp lệ: N ngày liên tục kết thúc 2026-07-03, nhiệt tăng dần.</summary>
    private static string ArchiveBody(int days, string? tail = null)
    {
        var end = new DateTime(2026, 7, 3);
        var dates = new List<string>();
        var maxes = new List<string>();
        var mins = new List<string>();
        var rains = new List<string>();
        for (var i = days - 1; i >= 0; i--)
        {
            dates.Add($"\"{end.AddDays(-i):yyyy-MM-dd}\"");
            maxes.Add((30 + (days - 1 - i) % 5).ToString());
            mins.Add((24 + (days - 1 - i) % 3).ToString());
            rains.Add("1.5");
        }

        if (tail is not null)
        {
            // Chèn thêm phần tử null ở đuôi (archive trễ)
            dates.Add($"\"{end.AddDays(1):yyyy-MM-dd}\"");
            maxes.Add(tail);
            mins.Add(tail);
            rains.Add(tail);
        }

        return $$"""
            {
              "daily": {
                "time": [{{string.Join(",", dates)}}],
                "temperature_2m_max": [{{string.Join(",", maxes)}}],
                "temperature_2m_min": [{{string.Join(",", mins)}}],
                "precipitation_sum": [{{string.Join(",", rains)}}]
              }
            }
            """;
    }

    private static Task<IResult> CallAsync(WeatherApp.Api.Services.OpenMeteoClient client, double? lat = null, double? lon = null)
        => HistoryEndpoints.HandleAsync(lat ?? HaNoi.Lat, lon ?? HaNoi.Lon, client, Time, CancellationToken.None);

    [Fact]
    public async Task TraVe30NgayCuoi_VaNormalTrungBinh()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, ArchiveBody(90));
        var client = TestOpenMeteo.CreateClient(handler, Time);

        var result = await CallAsync(client);

        var ok = Assert.IsType<Ok<HistoryResponseDto>>(result);
        Assert.Equal(30, ok.Value!.Days.Count);
        Assert.Equal("2026-07-03", ok.Value.Days[^1].Date);
        // Normal tính từ cửa sổ ±7 ngày quanh 2026-07-04 — dữ liệu 90 ngày có đủ cửa sổ
        Assert.NotNull(ok.Value.Normal);
        Assert.InRange(ok.Value.Normal!.TempMax, 30, 35);
        Assert.InRange(ok.Value.Normal.TempMin, 24, 27);
    }

    [Fact]
    public async Task BoQuaNgayNullODuoi_ArchiveTre()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, ArchiveBody(40, tail: "null"));
        var client = TestOpenMeteo.CreateClient(handler, Time);

        var result = await CallAsync(client);

        var ok = Assert.IsType<Ok<HistoryResponseDto>>(result);
        // Ngày null bị loại — ngày cuối vẫn là ngày có dữ liệu
        Assert.Equal("2026-07-03", ok.Value!.Days[^1].Date);
    }

    [Fact]
    public async Task GhepUrlDungThamSo_StartEnd10Nam_InvariantCulture()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, ArchiveBody(30));
        var client = TestOpenMeteo.CreateClient(handler, Time);

        await CallAsync(client);

        var url = handler.LastRequestUri!.AbsoluteUri;
        Assert.StartsWith(TestOpenMeteo.ArchiveUrl, url);
        Assert.Contains("latitude=21.03", url);
        Assert.Contains("start_date=2016-07-04", url);
        Assert.Contains("end_date=2026-07-03", url);
        Assert.Contains("daily=temperature_2m_max,temperature_2m_min,precipitation_sum", url);
        Assert.DoesNotContain("21,0278", url);
    }

    [Theory]
    [InlineData(-91.0, 105.8)]
    [InlineData(double.NaN, 105.8)]
    public async Task LatSai_Tra400(double lat, double lon)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ArchiveBody(30));

        var result = await CallAsync(client, lat, lon);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Fact]
    public async Task UpstreamLoi_Tra502()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.BadGateway, "boom");

        var result = await CallAsync(client);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, problem.StatusCode);
    }

    [Fact]
    public async Task Body200NhungToanNull_Tra502()
    {
        const string body = """
            { "daily": { "time": ["2026-07-03"], "temperature_2m_max": [null], "temperature_2m_min": [null], "precipitation_sum": [null] } }
            """;
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, body);

        var result = await CallAsync(client);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, problem.StatusCode);
    }
}
