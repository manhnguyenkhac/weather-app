# Multi-stage build cho WeatherApp.Api (.NET 10) — Render chạy .NET qua Docker
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore trước để tận dụng layer cache khi chỉ đổi code
COPY WeatherApp.Api.csproj .
RUN dotnet restore WeatherApp.Api.csproj

COPY . .
RUN dotnet publish WeatherApp.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# Render cấp cổng qua biến PORT lúc runtime — bind 0.0.0.0:$PORT (fallback 8080 khi chạy local)
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
# Không chạy root: user 'app' có sẵn trong image aspnet, PORT của Render (10000) > 1024 nên bind được
USER app
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet WeatherApp.Api.dll"]
