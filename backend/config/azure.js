const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');

// Azure Blob Storage Configuration
const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);

const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_NAME
);

// Azure Cosmos DB Configuration
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

// Initialize container (create if doesn't exist)
async function initializeStorage() {
    try {
        await containerClient.createIfNotExists();
        console.log('✅ Azure Blob Storage container ready');
    } catch (error) {
        console.error('❌ Error initializing blob storage:', error.message);
    }
}

// Call initialization
initializeStorage();

module.exports = {
    containerClient,
    cosmosContainer: container
};