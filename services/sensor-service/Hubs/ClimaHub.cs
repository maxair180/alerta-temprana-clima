using Microsoft.AspNetCore.SignalR;

namespace SensorService.Hubs;

public class ClimaHub : Hub
{
    private readonly ILogger<ClimaHub> _logger;

    public ClimaHub(ILogger<ClimaHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("📡 Cliente conectado a ClimaHub: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("🔌 Cliente desconectado de ClimaHub: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
