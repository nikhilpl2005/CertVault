const { v4: uuidv4 } = require('uuid');
const { containerClient, cosmosContainer } = require('../config/azure');

// ============================================
// UPLOAD CERTIFICATE
// ============================================
exports.uploadCertificate = async (req, res) => {
    try {
        console.log('📤 Upload request received');
        
        const { name, issuer, date, category, notes, fileData, fileName } = req.body;

        // Validate required fields
        if (!name || !issuer || !date || !category || !fileData || !fileName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Generate unique ID for this certificate
        const id = uuidv4();
        const blobName = `${id}-${fileName}`;

        console.log('📄 Processing file:', fileName);

        // Convert base64 to buffer
        const base64Data = fileData.split(',')[1]; // Remove "data:application/pdf;base64," prefix
        const buffer = Buffer.from(base64Data, 'base64');

        console.log('☁️ Uploading to Azure Blob Storage...');

        // Upload file to Azure Blob Storage
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { 
                blobContentType: 'application/pdf' 
            }
        });

        // Get the URL of uploaded blob
        const fileUrl = blockBlobClient.url;

        console.log('💾 Saving metadata to Cosmos DB...');

        // Create metadata object
        const metadata = {
            id: id,
            name: name,
            issuer: issuer,
            date: date,
            category: category,
            notes: notes || '',
            fileName: fileName,
            blobName: blobName,
            fileUrl: fileUrl,
            uploadedAt: new Date().toISOString()
        };

        // Save metadata to Cosmos DB
        await cosmosContainer.items.create(metadata);

        console.log('✅ Certificate uploaded successfully:', id);

        // Send success response
        res.status(201).json({
            success: true,
            message: 'Certificate uploaded successfully',
            data: metadata
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload certificate',
            error: error.message
        });
    }
};

// ============================================
// GET ALL CERTIFICATES
// ============================================
exports.getAllCertificates = async (req, res) => {
    try {
        console.log('📋 Fetching all certificates...');

        // Query all items from Cosmos DB
        const { resources } = await cosmosContainer.items
            .readAll()
            .fetchAll();

        console.log(`✅ Found ${resources.length} certificates`);

        res.json({
            success: true,
            count: resources.length,
            data: resources
        });

    } catch (error) {
        console.error('❌ Fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch certificates',
            error: error.message
        });
    }
};

// ============================================
// GET SINGLE CERTIFICATE
// ============================================
exports.getCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching certificate:', id);

        // Read item from Cosmos DB
        const { resource } = await cosmosContainer.item(id, id).read();

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        console.log('✅ Certificate found:', resource.name);

        res.json({
            success: true,
            data: resource
        });

    } catch (error) {
        console.error('❌ Fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch certificate',
            error: error.message
        });
    }
};

// ============================================
// DELETE CERTIFICATE
// ============================================
exports.deleteCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Delete request for certificate:', id);

        // Get certificate metadata from Cosmos DB
        const { resource } = await cosmosContainer.item(id, id).read();

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        console.log('🗑️ Deleting blob from storage...');

        // Delete file from Azure Blob Storage
        const blockBlobClient = containerClient.getBlockBlobClient(resource.blobName);
        await blockBlobClient.delete();

        console.log('🗑️ Deleting metadata from database...');

        // Delete metadata from Cosmos DB
        await cosmosContainer.item(id, id).delete();

        console.log('✅ Certificate deleted successfully');

        res.json({
            success: true,
            message: 'Certificate deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete certificate',
            error: error.message
        });
    }
};

// ============================================
// DOWNLOAD CERTIFICATE
// ============================================
exports.downloadCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('⬇️ Download request for certificate:', id);

        // Get certificate metadata
        const { resource } = await cosmosContainer.item(id, id).read();

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        console.log('⬇️ Downloading blob from storage...');

        // Get blob from Azure Storage
        const blockBlobClient = containerClient.getBlockBlobClient(resource.blobName);
        const downloadResponse = await blockBlobClient.download(0);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resource.fileName}"`);

        // Stream the file to response
        downloadResponse.readableStreamBody.pipe(res);

        console.log('✅ Download started for:', resource.fileName);

    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download certificate',
            error: error.message
        });
    }
};