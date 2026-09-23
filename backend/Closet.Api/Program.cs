using Closet.Api.Data;
using Closet.Api.Models;
using Microsoft.EntityFrameworkCore;
using Azure.Storage.Blobs;

var builder = WebApplication.CreateBuilder(args);

// SQLite: un solo archivo local, sin necesidad de instalar ningun motor de base de datos.
builder.Services.AddDbContext<ClosetDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var blobConnection = builder.Configuration
    .GetConnectionString("BlobStorage")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:BlobStorage");

builder.Services.AddSingleton(_ => new BlobServiceClient(blobConnection));

var app = builder.Build();

var blobService = app.Services.GetRequiredService<BlobServiceClient>();
var container = blobService.GetBlobContainerClient("garments");
await container.CreateIfNotExistsAsync();

app.UseSwagger();
app.UseSwaggerUI();

// Crea el archivo closet.db y la tabla si no existen, y mete un dato de prueba.
// Esto es justo la tarea del dia 1: "que guarde y lea un dato de ejemplo".
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ClosetDbContext>();
    db.Database.EnsureCreated();

    if (!db.Garments.Any())
    {
        db.Garments.Add(new Garment { Name = "Playera de prueba", BodyPart = BodyPart.Torso });
        db.SaveChanges();
    }
}

// Endpoint minimo solo para comprobar que SQLite esta leyendo y guardando bien.
// El endpoint real (GET /api/garments) se hace hasta el dia 2.
app.MapGet("/api/test", async (ClosetDbContext db) =>
    await db.Garments.ToListAsync());

app.Run();
