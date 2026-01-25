using Azure;
using Azure.AI.OpenAI;
using OpenAI.Images;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using Azure.Storage.Blobs; // Added for Blob Storage
using Microsoft.Azure.Cosmos;

namespace FigurineStudio.Backend
{
    public class FigurineFunction
    {
        private readonly ILogger _logger;

        public FigurineFunction(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<FigurineFunction>();
        }

        // Function to save a new figurine to the database
        [Function("SaveFigurine")]
        public async Task<FigurineResponse> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function started.");

            // 1. Parse the user's prompt
            var requestBody = await req.ReadFromJsonAsync<FigurineRequest>();
            string userPrompt = requestBody?.Prompt ?? "A futuristic glass figurine";

            // 2. Initialize Azure OpenAI Client
            string endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
            string apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY");
            string deploymentName = "dall-e-3"; 

            AzureOpenAIClient azureClient = new(new Uri(endpoint), new AzureKeyCredential(apiKey));
            ImageClient imageClient = azureClient.GetImageClient(deploymentName);

            // 3. Generate the Image
            _logger.LogInformation($"Generating image for prompt: {userPrompt}");
            var options = new ImageGenerationOptions 
            { 
                Size = GeneratedImageSize.W1024xH1024, 
                Quality = GeneratedImageQuality.Standard 
            };

            GeneratedImage generatedImage = await imageClient.GenerateImageAsync(userPrompt, options);
            string temporaryImageUrl = generatedImage.ImageUri.ToString();

            // 4. Download and Save to Permanent Blob Storage
            _logger.LogInformation("Uploading image to permanent storage...");
            string permanentUrl = await SaveImageToBlob(temporaryImageUrl);

            // 5. Prepare the item for Cosmos DB with the PERMANENT URL
            var newItem = new FigurineItem
            {
                id = Guid.NewGuid().ToString(),
                userId = "test-user-123",
                prompt = userPrompt,
                url = permanentUrl,
                createdAt = DateTime.UtcNow
            };

            // 6. Create the HTTP response for Angular
            var httpResponse = req.CreateResponse(HttpStatusCode.OK);
            await httpResponse.WriteAsJsonAsync(newItem);

            return new FigurineResponse
            {
                NewItem = newItem,
                HttpResponse = httpResponse
            };
        }

        // Helper method to handle the permanent storage logic for the generated image
        private async Task<string> SaveImageToBlob(string imageUrl)
        {
            // Bypass SSL validation (Debug Only)
            HttpClientHandler handler = new HttpClientHandler()
            {
                ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true
            };
            using HttpClient httpClient = new HttpClient(handler);
            byte[] imageBytes = await httpClient.GetByteArrayAsync(imageUrl);

            string connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            BlobServiceClient blobServiceClient = new BlobServiceClient(connectionString);
            BlobContainerClient containerClient = blobServiceClient.GetBlobContainerClient("figurines");
            
            await containerClient.CreateIfNotExistsAsync(Azure.Storage.Blobs.Models.PublicAccessType.Blob);

            string fileName = $"{Guid.NewGuid()}.png";
            BlobClient blobClient = containerClient.GetBlobClient(fileName);

            using (var stream = new MemoryStream(imageBytes))
            {
                await blobClient.UploadAsync(stream, true);
            }

            return blobClient.Uri.ToString();
        }

        // Function to get history
        [Function("GetHistory")]
        public static HttpResponseData GetHistory(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "history/{userId}")] HttpRequestData req,
            [CosmosDBInput(
                databaseName: "StudioDB",
                containerName: "Collections",
                Connection = "CosmosDBConnection",
                SqlQuery = "SELECT * FROM c WHERE c.userId = {userId} ORDER BY c.createdAt DESC")] 
                IEnumerable<FigurineItem> items,
            string userId)
        {
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.WriteAsJsonAsync(items);
            return response;
        }
        // Function to delete a figurine image from the database
        [Function("DeleteFigurine")]
        public async Task<HttpResponseData> DeleteFigurine(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "figurine/{id}")] HttpRequestData req,
            string id,
            [CosmosDBInput("StudioDB", "Collections", Connection = "CosmosDBConnection")] CosmosClient client)
        {
            _logger.LogInformation($"Attempting to delete figurine and blob: {id}");
            string partitionKey = "test-user-123"; 

            try
            {
                var container = client.GetContainer("StudioDB", "Collections");
                
                // 1. Fetch the item first to get the Image URL
                var itemResponse = await container.ReadItemAsync<FigurineItem>(id, new PartitionKey(partitionKey));
                string imageUrl = itemResponse.Resource.url;

                // 2. Delete the Blob from Storage
                if (!string.IsNullOrEmpty(imageUrl))
                {
                    string connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                    BlobServiceClient blobServiceClient = new BlobServiceClient(connectionString);
                    BlobContainerClient containerClient = blobServiceClient.GetBlobContainerClient("figurines");
                    
                    // Extract the filename from the URL (e.g., "uuid.png")
                    string blobName = Path.GetFileName(new Uri(imageUrl).LocalPath);
                    BlobClient blobClient = containerClient.GetBlobClient(blobName);
                    
                    await blobClient.DeleteIfExistsAsync();
                    _logger.LogInformation($"Deleted blob: {blobName}");
                }

                // 3. Delete the record from Cosmos DB
                await container.DeleteItemAsync<FigurineItem>(id, new PartitionKey(partitionKey));

                return req.CreateResponse(HttpStatusCode.NoContent); 
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return req.CreateResponse(HttpStatusCode.NotFound);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Delete failed: {ex.Message}");
                return req.CreateResponse(HttpStatusCode.InternalServerError);
            }
        }
    }

    // Models remain the same as your provided code
    public class FigurineRequest { public string Prompt { get; set; } }
    
    public class FigurineItem {
        public string id { get; set; }
        public string userId { get; set; }
        public string prompt { get; set; }
        public string url { get; set; }
        public DateTime createdAt { get; set; }
    }

    public class FigurineResponse
    {
        [CosmosDBOutput("StudioDB", "Collections", Connection = "CosmosDBConnection")]
        public FigurineItem NewItem { get; set; }
        public HttpResponseData HttpResponse { get; set; }
    }
}