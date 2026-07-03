using WeatherApp.Api.Models;

namespace WeatherApp.Api.Tests.Models;

public class HealthDtosTests
{
    [Fact]
    public void HealthResponse_GiuNguyenStatus_KhiKhoiTao()
    {
        var response = new HealthResponse("ok");

        Assert.Equal("ok", response.Status);
    }

    [Fact]
    public void HealthResponse_LaRecord_SoSanhTheoGiaTri()
    {
        var a = new HealthResponse("ok");
        var b = new HealthResponse("ok");

        Assert.Equal(a, b);
    }
}
