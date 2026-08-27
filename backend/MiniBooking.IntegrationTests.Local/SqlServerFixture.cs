using Microsoft.Data.SqlClient;
using Testcontainers.MsSql;

namespace MiniBooking.IntegrationTests.Local;

public sealed class SqlServerFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _container = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest")
        .WithPassword("Booking_test_2026!")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        await ExecuteScriptAsync("01-schema.sql");
        await ExecuteScriptAsync("02-stored-procedures.sql");
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    public async Task ResetDataAsync()
    {
        await ExecuteAsync("""
            DELETE FROM dbo.BookingNightRate;
            DELETE FROM dbo.Booking;
            DELETE FROM dbo.RoomRate;
            DELETE FROM dbo.Room;
            DELETE FROM dbo.Hotel;
            """);
    }

    public async Task ExecuteAsync(string sql)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<T> ExecuteScalarAsync<T>(string sql)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection);
        return (T)(await command.ExecuteScalarAsync()
            ?? throw new InvalidOperationException("The SQL command did not return a value."));
    }

    private async Task ExecuteScriptAsync(string fileName)
    {
        var script = await File.ReadAllTextAsync(
            Path.Combine(AppContext.BaseDirectory, "Database", fileName));
        var batches = System.Text.RegularExpressions.Regex.Split(
            script,
            @"(?im)^\s*GO\s*;?\s*$");

        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        foreach (var batch in batches.Where(value => !string.IsNullOrWhiteSpace(value)))
        {
            await using var command = new SqlCommand(batch, connection);
            await command.ExecuteNonQueryAsync();
        }
    }
}

[CollectionDefinition(Name)]
public sealed class SqlServerCollection : ICollectionFixture<SqlServerFixture>
{
    public const string Name = "Local SQL Server integration";
}
