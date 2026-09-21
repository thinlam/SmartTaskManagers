# Build context is backend/ — matches the .slnx layout (5 sibling
# projects: Domain/Application/Infrastructure/Persistence/Api), not a
# single flat project folder. net10.0 to match every .csproj's
# TargetFramework — dotnet/sdk:8.0 (an earlier draft) doesn't build this.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY . .

# Restoring SmartTask.Api.csproj alone is enough — dotnet restore follows
# its ProjectReferences (Application/Infrastructure/Persistence, which in
# turn reference Domain) transitively, so every project's packages get
# restored without listing each one here.
RUN dotnet restore SmartTask.Api/SmartTask.Api.csproj

RUN dotnet publish SmartTask.Api/SmartTask.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

# Matches Properties/launchSettings.json's http profile (Phase 32 —
# 0.0.0.0:5277, so the container's published port is actually reachable
# from outside it, not just from inside the container's own loopback).
ENV ASPNETCORE_URLS=http://0.0.0.0:5277
EXPOSE 5277

ENTRYPOINT ["dotnet", "SmartTask.Api.dll"]
