FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY . .

RUN dotnet restore SmartTask.Api/SmartTask.Api.csproj

RUN dotnet publish SmartTask.Api/SmartTask.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

# Railway (and most PaaS hosts) assign a container a $PORT env var at
# runtime and route traffic to it — it's rarely 8080. The base image's
# ASPNETCORE_HTTP_PORTS=8080 default is a fixed value, so it only works
# by coincidence; a platform that picks a different port gets "502
# Application failed to respond" because the container is listening on
# the wrong one. Shell-form ENTRYPOINT so ${PORT:-8080} is evaluated at
# container start, not baked in at build time — falls back to 8080 for
# `docker run` without $PORT set (matches the port EXPOSEd above).
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} exec dotnet SmartTask.Api.dll"]