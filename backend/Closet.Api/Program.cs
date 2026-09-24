using Closet.Api.Data;
using Closet.Api.Models;
using Microsoft.EntityFrameworkCore;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

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
// EndPoints

app.MapGet("/api/garments", async (ClosetDbContext db) =>
{
    var garments = await db.Garments.ToListAsync();

    var result = garments.Select(garment =>
    {
        string? imageUrl = null;

        if (!string.IsNullOrWhiteSpace(garment.FileName))
        {
            var blob = container.GetBlobClient(garment.FileName);

            imageUrl = blob.GenerateSasUri(
                BlobSasPermissions.Read,
                DateTimeOffset.UtcNow.AddHours(1)
            ).ToString();
        }

        return new
        {
            garment.Id,
            garment.Name,
            garment.BodyPart,
            garment.FileName,
            garment.CreatedAtUtc,
            ImageUrl = imageUrl
        };
    });

    return Results.Ok(result);
});


// POST: sube una foto a Blob y guarda la prenda en SQLite.
app.MapPost("/api/garments", async (
    [FromForm] string name,
    [FromForm] BodyPart bodyPart,
    IFormFile photo,
    ClosetDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(name))
        return Results.BadRequest("El nombre es obligatorio.");

    if (photo.Length == 0 || photo.Length > 5 * 1024 * 1024)
        return Results.BadRequest("La foto debe pesar entre 1 byte y 5 MB.");

    var extension = photo.ContentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => null
    };

    if (extension is null)
        return Results.BadRequest("Solo se permiten imágenes JPG, PNG o WEBP.");

    var fileName = $"{Guid.NewGuid()}{extension}";
    var blob = container.GetBlobClient(fileName);

    await blob.UploadAsync(
        photo.OpenReadStream(),
        new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = photo.ContentType
            }
        });

    var garment = new Garment
    {
        Name = name,
        BodyPart = bodyPart,
        FileName = fileName
    };

    try
    {
        db.Garments.Add(garment);
        await db.SaveChangesAsync();
    }
    catch
    {
        await blob.DeleteIfExistsAsync();
        throw;
    }

    return Results.Created($"/api/garments/{garment.Id}", garment);
})
.DisableAntiforgery();


// DELETE: elimina la foto de Blob y la prenda de SQLite.
app.MapDelete("/api/garments/{id:int}", async (
    int id,
    ClosetDbContext db) =>
{
    var garment = await db.Garments.FindAsync(id);

    if (garment is null)
        return Results.NotFound("No se encontró la prenda.");

    if (!string.IsNullOrWhiteSpace(garment.FileName))
    {
        var blob = container.GetBlobClient(garment.FileName);
        await blob.DeleteIfExistsAsync();
    }

    db.Garments.Remove(garment);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.Run();
