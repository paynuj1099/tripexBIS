using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace MiniBooking.Infrastructure.Data;
public interface IDbConnectionFactory
{
    Task<SqlConnection> CreateConnectionAsync(CancellationToken cancellationToken = default);
}
public sealed class SqlConnectionFactory(IConfiguration configuration) : IDbConnectionFactory
{
    private readonly string _connectionString = configuration.GetConnectionString("BookingDatabase") ?? throw new InvalidOperationException("BookingDatabase connection string is missing.");
    public async Task<SqlConnection> CreateConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }
}
